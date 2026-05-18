-- 2026-05-18: 배대지 영문 주소 — amazon 등 매입처 checkout 자동입력용.
-- account_id null = 짐스캐너 공용 시드, != null = 셀러 본인 커스텀.

CREATE TABLE IF NOT EXISTS public.b2b_forwarder_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.b2b_accounts(id) ON DELETE CASCADE,
  forwarder_id uuid NOT NULL REFERENCES public.forwarders(id) ON DELETE CASCADE,
  label text NOT NULL,
  recipient_name text NOT NULL,
  phone text,
  address1 text NOT NULL,
  address2 text,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  country text NOT NULL DEFAULT 'US',
  member_no text,
  is_official boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT b2b_forwarder_addresses_official_consistency
    CHECK ((is_official = true AND account_id IS NULL) OR (is_official = false))
);

CREATE INDEX IF NOT EXISTS idx_b2b_forwarder_addresses_account
  ON public.b2b_forwarder_addresses(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_b2b_forwarder_addresses_official
  ON public.b2b_forwarder_addresses(forwarder_id) WHERE is_official = true;

ALTER TABLE public.b2b_forwarder_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forwarder_addresses_select ON public.b2b_forwarder_addresses;
CREATE POLICY forwarder_addresses_select ON public.b2b_forwarder_addresses
  FOR SELECT TO authenticated
  USING (
    account_id IS NULL OR
    account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS forwarder_addresses_insert ON public.b2b_forwarder_addresses;
CREATE POLICY forwarder_addresses_insert ON public.b2b_forwarder_addresses
  FOR INSERT TO authenticated
  WITH CHECK (
    is_official = false AND
    account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS forwarder_addresses_update ON public.b2b_forwarder_addresses;
CREATE POLICY forwarder_addresses_update ON public.b2b_forwarder_addresses
  FOR UPDATE TO authenticated
  USING (
    is_official = false AND
    account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS forwarder_addresses_delete ON public.b2b_forwarder_addresses;
CREATE POLICY forwarder_addresses_delete ON public.b2b_forwarder_addresses
  FOR DELETE TO authenticated
  USING (
    is_official = false AND
    account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = auth.uid())
  );

COMMENT ON TABLE public.b2b_forwarder_addresses IS '배대지 영문 주소. account_id null = 짐스캐너 공용 시드. amazon checkout 자동입력에 사용.';
COMMENT ON COLUMN public.b2b_forwarder_addresses.member_no IS '배대지가 셀러에게 부여한 회원번호. 보통 address2 또는 recipient_name 에 함께 입력됨.';
