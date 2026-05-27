-- 2026-05-18: 익명 전체 셀러 통계 RPC (cron-25 / H1)
-- 본인 데이터와 비교하기 위한 supplier_site 별 평균. 개별 셀러 식별 정보는 노출 안 함 (k-anonymity).

CREATE OR REPLACE FUNCTION public.b2b_marketwide_supplier_stats(
  p_min_lines integer DEFAULT 20
)
RETURNS TABLE (
  supplier_site text,
  line_count bigint,
  avg_sale_krw numeric,
  median_sale_krw numeric,
  avg_qty numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      oi.supplier_site,
      NULLIF(oi.sale_price_krw, 0)::numeric AS sale_krw,
      oi.quantity::numeric AS qty
    FROM public.b2b_order_items oi
    JOIN public.b2b_orders o ON o.id = oi.order_id
    WHERE oi.supplier_site IS NOT NULL
      AND o.deleted_at IS NULL
      AND o.created_at >= now() - interval '180 days'
  )
  SELECT
    supplier_site,
    count(*) AS line_count,
    round(avg(sale_krw))::numeric AS avg_sale_krw,
    round(percentile_cont(0.5) WITHIN GROUP (ORDER BY sale_krw))::numeric AS median_sale_krw,
    round(avg(qty), 2)::numeric AS avg_qty
  FROM base
  WHERE sale_krw IS NOT NULL AND sale_krw > 0
  GROUP BY supplier_site
  HAVING count(*) >= p_min_lines
  ORDER BY line_count DESC
$$;

-- authenticated 세션이 /analytics 에서 직접 .rpc() 호출 — authenticated 만 EXECUTE 유지 (#auto-C 2026-05-28)
REVOKE EXECUTE ON FUNCTION public.b2b_marketwide_supplier_stats(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.b2b_marketwide_supplier_stats(integer) FROM anon;
GRANT  EXECUTE ON FUNCTION public.b2b_marketwide_supplier_stats(integer) TO authenticated;

COMMENT ON FUNCTION public.b2b_marketwide_supplier_stats IS
  '익명 전체 셀러의 supplier_site 별 평균 판매가·중간값·평균 수량. p_min_lines 이상 라인이 있어야 노출 (k-anonymity 최소 보장).';
