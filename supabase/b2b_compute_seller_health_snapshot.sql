-- 2026-05-27: Phase 0 #PH0-2 — 셀러 health 스냅샷 계산 함수 + pg_cron daily job
-- p_date 기준으로 모든 b2b_accounts loop 돌면서 b2b_seller_health_snapshot upsert.
-- Active state: deleted_at IS NULL.
-- write 는 service_role 의 이 함수 만 (SECURITY DEFINER), schema owner 권한.

CREATE OR REPLACE FUNCTION public.b2b_compute_seller_health_snapshot(p_date date DEFAULT NULL)
RETURNS TABLE (out_processed int, out_snapshot_date date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date := COALESCE(p_date, (now() AT TIME ZONE 'Asia/Seoul')::date);
  v_count int := 0;
  v_now timestamptz := now();
  v_30d timestamptz := v_now - interval '30 days';
  v_7d  timestamptz := v_now - interval '7 days';
  v_14d timestamptz := v_now - interval '14 days';
BEGIN
  -- 진행 중 (terminal 아님) 상태 집합
  -- terminal: delivered, completed, cancelled, refunded, customs_denied
  -- pending  : pending, confirmed, paid, forwarder_submitted, in_transit, arrived_korea
  -- (refund_requested, disputed 는 별도 — pending 으로 카운트하지 않음)

  WITH acc AS (
    SELECT
      a.id AS account_id,
      a.verification_level,
      a.verification_status,
      a.last_login_at
    FROM public.b2b_accounts a
    WHERE a.deleted_at IS NULL
  ),
  sub AS (
    SELECT DISTINCT ON (s.account_id)
      s.account_id,
      p.plan_code,
      s.status AS plan_status
    FROM public.b2b_subscriptions s
    LEFT JOIN public.b2b_subscription_plans p ON p.id = s.plan_id
    ORDER BY s.account_id, s.created_at DESC
  ),
  ord_total AS (
    SELECT account_id, count(*)::int AS n, max(created_at) AS last_order_at
    FROM public.b2b_orders
    WHERE deleted_at IS NULL
    GROUP BY account_id
  ),
  ord_30d AS (
    SELECT account_id, count(*)::int AS n
    FROM public.b2b_orders
    WHERE deleted_at IS NULL AND created_at >= v_30d
    GROUP BY account_id
  ),
  ord_pending AS (
    SELECT account_id, count(*)::int AS n
    FROM public.b2b_orders
    WHERE deleted_at IS NULL
      AND status IN ('pending','confirmed','paid','forwarder_submitted','in_transit','arrived_korea')
    GROUP BY account_id
  ),
  ord_stuck AS (
    SELECT account_id, count(*)::int AS n
    FROM public.b2b_orders
    WHERE deleted_at IS NULL
      AND status IN ('pending','confirmed','paid','forwarder_submitted','in_transit','arrived_korea')
      AND created_at < v_7d
    GROUP BY account_id
  ),
  sales_30d AS (
    -- 매출 (sale_price_krw) / 매입 (total_price_krw) / 마진 30일
    SELECT
      o.account_id,
      COALESCE(sum(i.sale_price_krw), 0)::bigint AS sales_krw,
      COALESCE(sum(i.total_price_krw), 0)::bigint AS purchase_krw,
      count(*) FILTER (
        WHERE (i.sale_price_krw IS NULL OR i.total_price_krw IS NULL
               OR (COALESCE(i.sale_price_krw,0) - COALESCE(i.total_price_krw,0)) < 0)
      )::int AS margin_failed
    FROM public.b2b_orders o
    JOIN public.b2b_order_items i ON i.order_id = o.id
    WHERE o.deleted_at IS NULL AND o.created_at >= v_30d
    GROUP BY o.account_id
  ),
  ext AS (
    -- 확장 사용: supplier_purchases 1+ 또는 seller_tokens 활성 1+
    SELECT account_id, true AS has_extension
    FROM (
      SELECT account_id FROM public.b2b_supplier_purchases
      UNION
      SELECT account_id FROM public.b2b_seller_tokens WHERE revoked_at IS NULL
    ) t
    GROUP BY account_id
  ),
  prod AS (
    SELECT account_id, count(*)::int AS n
    FROM public.b2b_products
    WHERE is_active = true
    GROUP BY account_id
  ),
  rec_7d AS (
    SELECT account_id, count(*)::int AS n
    FROM public.b2b_supplier_purchases
    WHERE created_at >= v_7d
    GROUP BY account_id
  ),
  matched AS (
    -- b2b_order_items 중 product_id 채워진 비율 (%) — 누적 기준
    SELECT
      o.account_id,
      CASE WHEN count(*) = 0 THEN NULL
           ELSE round(count(*) FILTER (WHERE i.product_id IS NOT NULL)::numeric * 100 / count(*), 2)
      END AS matched_pct
    FROM public.b2b_orders o
    JOIN public.b2b_order_items i ON i.order_id = o.id
    WHERE o.deleted_at IS NULL
    GROUP BY o.account_id
  ),
  combined AS (
    SELECT
      acc.account_id,
      acc.verification_level,
      acc.verification_status,
      sub.plan_code,
      sub.plan_status,
      COALESCE(ord_total.n, 0) AS orders_total,
      COALESCE(ord_30d.n, 0)   AS orders_30d,
      COALESCE(ord_pending.n, 0) AS orders_pending,
      COALESCE(ord_stuck.n, 0)   AS orders_stuck,
      ord_total.last_order_at,
      COALESCE(sales_30d.sales_krw, 0) AS sales_30d_krw,
      COALESCE(sales_30d.purchase_krw, 0) AS purchase_30d_krw,
      COALESCE(sales_30d.sales_krw, 0) - COALESCE(sales_30d.purchase_krw, 0) AS margin_30d_krw,
      COALESCE(sales_30d.margin_failed, 0) AS margin_failed_count,
      COALESCE(ext.has_extension, false) AS has_extension,
      COALESCE(prod.n, 0) AS products_count,
      COALESCE(rec_7d.n, 0) AS receipts_7d,
      matched.matched_pct,
      acc.last_login_at
    FROM acc
    LEFT JOIN sub ON sub.account_id = acc.account_id
    LEFT JOIN ord_total ON ord_total.account_id = acc.account_id
    LEFT JOIN ord_30d ON ord_30d.account_id = acc.account_id
    LEFT JOIN ord_pending ON ord_pending.account_id = acc.account_id
    LEFT JOIN ord_stuck ON ord_stuck.account_id = acc.account_id
    LEFT JOIN sales_30d ON sales_30d.account_id = acc.account_id
    LEFT JOIN ext ON ext.account_id = acc.account_id
    LEFT JOIN prod ON prod.account_id = acc.account_id
    LEFT JOIN rec_7d ON rec_7d.account_id = acc.account_id
    LEFT JOIN matched ON matched.account_id = acc.account_id
  ),
  scored AS (
    SELECT
      c.*,
      (
        -- 가입 14일 이상 + 30일 주문 0 → no_orders_14d
        CASE WHEN c.orders_30d = 0 AND (c.last_order_at IS NULL OR c.last_order_at < v_14d) THEN '"no_orders_14d"'::jsonb ELSE NULL END
      ) AS flag_no_orders,
      (CASE WHEN c.margin_failed_count > 0 THEN '"margin_failed"'::jsonb ELSE NULL END) AS flag_margin,
      (CASE WHEN c.verification_level IS NULL OR c.verification_level < 2 THEN '"verification_l1"'::jsonb ELSE NULL END) AS flag_verif,
      (CASE WHEN c.has_extension = false THEN '"no_extension"'::jsonb ELSE NULL END) AS flag_no_ext,
      (CASE WHEN c.plan_status IN ('canceled','cancelled') THEN '"plan_canceled"'::jsonb ELSE NULL END) AS flag_plan,
      (CASE WHEN c.orders_stuck > 0 THEN '"orders_stuck"'::jsonb ELSE NULL END) AS flag_stuck
    FROM combined c
  ),
  final AS (
    SELECT s.* FROM scored s
  )
  INSERT INTO public.b2b_seller_health_snapshot AS h (
    account_id, snapshot_date,
    verification_level, verification_status, plan_code, plan_status,
    orders_total, orders_30d, orders_pending, orders_stuck, last_order_at,
    sales_30d_krw, purchase_30d_krw, margin_30d_krw, margin_failed_count,
    has_extension, products_count, receipts_7d, matched_pct,
    issue_flags, health_score, last_login_at, computed_at
  )
  SELECT
    f.account_id,
    v_date,
    f.verification_level, f.verification_status, f.plan_code, f.plan_status,
    f.orders_total, f.orders_30d, f.orders_pending, f.orders_stuck, f.last_order_at,
    f.sales_30d_krw, f.purchase_30d_krw, f.margin_30d_krw, f.margin_failed_count,
    f.has_extension, f.products_count, f.receipts_7d, f.matched_pct,
    -- issue_flags: null 제거 후 jsonb array 조립
    COALESCE(
      (SELECT jsonb_agg(x) FROM unnest(ARRAY[
        f.flag_no_orders, f.flag_margin, f.flag_verif, f.flag_no_ext, f.flag_plan, f.flag_stuck
      ]) x WHERE x IS NOT NULL),
      '[]'::jsonb
    ),
    -- health_score: 100 에서 가중 감점
    GREATEST(0, LEAST(100,
      100
      - (CASE WHEN f.flag_no_orders IS NOT NULL THEN 25 ELSE 0 END)
      - (CASE WHEN f.flag_margin    IS NOT NULL THEN 15 ELSE 0 END)
      - (CASE WHEN f.flag_verif     IS NOT NULL THEN 10 ELSE 0 END)
      - (CASE WHEN f.flag_no_ext    IS NOT NULL THEN 10 ELSE 0 END)
      - (CASE WHEN f.flag_plan      IS NOT NULL THEN 20 ELSE 0 END)
      - (CASE WHEN f.flag_stuck     IS NOT NULL THEN 10 ELSE 0 END)
    ))::int,
    f.last_login_at,
    v_now
  FROM final f
  ON CONFLICT (account_id, snapshot_date) DO UPDATE SET
    verification_level   = EXCLUDED.verification_level,
    verification_status  = EXCLUDED.verification_status,
    plan_code            = EXCLUDED.plan_code,
    plan_status          = EXCLUDED.plan_status,
    orders_total         = EXCLUDED.orders_total,
    orders_30d           = EXCLUDED.orders_30d,
    orders_pending       = EXCLUDED.orders_pending,
    orders_stuck         = EXCLUDED.orders_stuck,
    last_order_at        = EXCLUDED.last_order_at,
    sales_30d_krw        = EXCLUDED.sales_30d_krw,
    purchase_30d_krw     = EXCLUDED.purchase_30d_krw,
    margin_30d_krw       = EXCLUDED.margin_30d_krw,
    margin_failed_count  = EXCLUDED.margin_failed_count,
    has_extension        = EXCLUDED.has_extension,
    products_count       = EXCLUDED.products_count,
    receipts_7d          = EXCLUDED.receipts_7d,
    matched_pct          = EXCLUDED.matched_pct,
    issue_flags          = EXCLUDED.issue_flags,
    health_score         = EXCLUDED.health_score,
    last_login_at        = EXCLUDED.last_login_at,
    computed_at          = EXCLUDED.computed_at;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count, v_date;
END;
$$;

COMMENT ON FUNCTION public.b2b_compute_seller_health_snapshot(date) IS
  'Phase 0 #PH0-2: 모든 active b2b_accounts 의 health metric 을 계산해 b2b_seller_health_snapshot upsert. pg_cron 이 매일 KST 04:00 호출.';

-- pg_cron daily job 등록 (KST 04:00 = UTC 19:00 전날). pg_cron 은 UTC 기준이므로 19:00 UTC 로 등록.
-- 기존 동명 job 있으면 unschedule 후 재등록 (idempotent).
DO $cron$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'b2b_seller_health_snapshot_daily';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
  PERFORM cron.schedule(
    'b2b_seller_health_snapshot_daily',
    '0 19 * * *',
    $cmd$ SELECT public.b2b_compute_seller_health_snapshot(); $cmd$
  );
END
$cron$;

-- pg_cron / service_role 전용 — PUBLIC/anon/authenticated EXECUTE 차단 (#auto-C 2026-05-28)
REVOKE EXECUTE ON FUNCTION public.b2b_compute_seller_health_snapshot(date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.b2b_compute_seller_health_snapshot(date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.b2b_compute_seller_health_snapshot(date) FROM authenticated;
