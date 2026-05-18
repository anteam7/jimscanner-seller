-- 2026-05-18: 매입처 영수증 수집 (브라우저 확장) + 확장용 API 토큰
-- 1단계 백엔드 — 한국 마켓 주문(b2b_orders) 과의 매칭 UI 는 후속.

-- 1) 매입처 영수증
CREATE TABLE IF NOT EXISTS public.b2b_supplier_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.b2b_accounts(id) ON DELETE CASCADE,
  source text NOT NULL,
  supplier_order_number text NOT NULL,
  purchased_at timestamptz,
  currency text,
  subtotal_foreign numeric,
  shipping_foreign numeric,
  tax_foreign numeric,
  total_foreign numeric,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_url text,
  raw_meta jsonb,
  matched_order_id uuid REFERENCES public.b2b_orders(id) ON DELETE SET NULL,
  matched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT b2b_supplier_purchases_source_chk CHECK (
    source IN ('amazon_us','amazon_jp','rakuten','yahoo')
  ),
  CONSTRAINT b2b_supplier_purchases_uniq UNIQUE (account_id, source, supplier_order_number)
);

CREATE INDEX IF NOT EXISTS idx_b2b_supplier_purchases_account_created
  ON public.b2b_supplier_purchases(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_b2b_supplier_purchases_unmatched
  ON public.b2b_supplier_purchases(account_id) WHERE matched_order_id IS NULL;

ALTER TABLE public.b2b_supplier_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS supplier_purchases_select_own ON public.b2b_supplier_purchases;
CREATE POLICY supplier_purchases_select_own ON public.b2b_supplier_purchases
  FOR SELECT TO authenticated USING (
    account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS supplier_purchases_update_own ON public.b2b_supplier_purchases;
CREATE POLICY supplier_purchases_update_own ON public.b2b_supplier_purchases
  FOR UPDATE TO authenticated USING (
    account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS supplier_purchases_delete_own ON public.b2b_supplier_purchases;
CREATE POLICY supplier_purchases_delete_own ON public.b2b_supplier_purchases
  FOR DELETE TO authenticated USING (
    account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = auth.uid())
  );
-- INSERT 는 service_role 에서만 (확장 → API → admin client).

COMMENT ON TABLE public.b2b_supplier_purchases IS '브라우저 확장이 수집한 해외 매입처 주문 영수증.';

-- 2) 브라우저 확장용 API 토큰
CREATE TABLE IF NOT EXISTS public.b2b_seller_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.b2b_accounts(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'browser-extension',
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_b2b_seller_tokens_account_active
  ON public.b2b_seller_tokens(account_id) WHERE revoked_at IS NULL;

ALTER TABLE public.b2b_seller_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seller_tokens_select_own ON public.b2b_seller_tokens;
CREATE POLICY seller_tokens_select_own ON public.b2b_seller_tokens
  FOR SELECT TO authenticated USING (
    account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = auth.uid())
  );

COMMENT ON TABLE public.b2b_seller_tokens IS '브라우저 확장이 사용할 long-lived API 토큰. raw 는 sha256 hash 만 저장.';
