-- 2026-05-27: 슈퍼 어드민 셀러 health 가시화 (Phase 0 #PH0-1)
-- 일별 셀러 상태 스냅샷. pg_cron 이 매일 KST 04:00 에 b2b_compute_seller_health_snapshot() 호출 (#PH0-2 에서 등록).
-- 어드민 /admin/b2b/health 페이지 + 셀러 본인 /dashboard 미니카드가 이 테이블 read.
-- service_role 만 write. 셀러는 자기 row 만 read.

CREATE TABLE IF NOT EXISTS public.b2b_seller_health_snapshot (
  account_id uuid NOT NULL REFERENCES public.b2b_accounts(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')::date,

  -- 검증 / 플랜
  verification_level int,
  verification_status text,
  plan_code text,
  plan_status text,                                  -- 'active' | 'canceled' | 'suspended' | 'free' | null

  -- 주문 활동
  orders_total int NOT NULL DEFAULT 0,               -- 가입 이래 누적
  orders_30d int NOT NULL DEFAULT 0,
  orders_pending int NOT NULL DEFAULT 0,             -- status in ('purchasing','shipped_to_forwarder')
  orders_stuck int NOT NULL DEFAULT 0,               -- pending 인데 7일 이상 정체
  last_order_at timestamptz,

  -- 매출 / 마진 (KRW)
  sales_30d_krw bigint NOT NULL DEFAULT 0,
  purchase_30d_krw bigint NOT NULL DEFAULT 0,
  margin_30d_krw bigint NOT NULL DEFAULT 0,
  margin_failed_count int NOT NULL DEFAULT 0,        -- 마진 음수 또는 미입력 라인

  -- 도구 활용
  has_extension boolean NOT NULL DEFAULT false,      -- supplier_purchases 또는 token 1+ row 존재
  products_count int NOT NULL DEFAULT 0,             -- b2b_products row
  receipts_7d int NOT NULL DEFAULT 0,                -- 최근 7일 영수증 수집
  matched_pct numeric(5,2),                          -- b2b_order_items 중 product_id 있는 비율 (%)

  -- 이슈 / 점수
  issue_flags jsonb NOT NULL DEFAULT '[]'::jsonb,    -- ["no_orders_14d","margin_failed","verification_l1"...]
  health_score int,                                  -- 0~100

  -- 메타
  last_login_at timestamptz,
  computed_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (account_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_b2b_seller_health_date
  ON public.b2b_seller_health_snapshot(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_b2b_seller_health_score
  ON public.b2b_seller_health_snapshot(snapshot_date, health_score)
  WHERE health_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_b2b_seller_health_account
  ON public.b2b_seller_health_snapshot(account_id, snapshot_date DESC);

ALTER TABLE public.b2b_seller_health_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seller_health_select_own ON public.b2b_seller_health_snapshot;
CREATE POLICY seller_health_select_own ON public.b2b_seller_health_snapshot
  FOR SELECT TO authenticated
  USING (
    account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = auth.uid())
  );

COMMENT ON TABLE public.b2b_seller_health_snapshot IS '일별 셀러 health 스냅샷 — 어드민 모니터링 + 셀러 self-view. write 는 service_role 의 b2b_compute_seller_health_snapshot() 만.';
COMMENT ON COLUMN public.b2b_seller_health_snapshot.issue_flags IS 'JSON array of issue codes: no_orders_14d, margin_failed, verification_l1, no_extension, plan_canceled, etc.';
COMMENT ON COLUMN public.b2b_seller_health_snapshot.health_score IS '0~100 가중합. 어드민 정렬·셀러 self-view 둘 다 이 값 사용.';
COMMENT ON COLUMN public.b2b_seller_health_snapshot.matched_pct IS 'b2b_order_items 중 product_id 가 채워진 비율 (%). SKU 마스터 활용도.';
