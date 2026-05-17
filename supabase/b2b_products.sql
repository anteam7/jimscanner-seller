-- v0.5: SKU 마스터 (상품 카탈로그)
-- 반복 주문 자동 매칭 → 매번 같은 정보 다시 입력하지 않도록

-- ============================================================
-- 1. b2b_products : 셀러 자체 SKU 마스터
-- ============================================================
CREATE TABLE IF NOT EXISTS b2b_products (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id               uuid NOT NULL REFERENCES b2b_accounts(id) ON DELETE CASCADE,
  seller_sku               text NOT NULL,             -- 셀러 자체 SKU 코드 (예: ANK-PWR-20K-BK)
  display_name             text NOT NULL,             -- 한국어/표시명
  english_name             text,                      -- 양식 변환용 영문상품명
  category                 text,                      -- 자유 텍스트 (의류/전자/식품/...)
  -- 기본값 (주문 시 자동 채움)
  default_supplier_site    text,                      -- 'amazon_us' 등
  default_currency         text,                      -- 'USD'
  default_unit_price       numeric(12,4),             -- 매입 단가
  default_forwarder_id     uuid REFERENCES forwarders(id) ON DELETE SET NULL,
  default_forwarder_country text,
  default_weight_kg        numeric(8,3),
  -- 메타
  image_url                text,
  notes                    text,
  is_active                boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, seller_sku)
);

CREATE INDEX IF NOT EXISTS idx_b2b_products_account ON b2b_products(account_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_b2b_products_account_active ON b2b_products(account_id, is_active);

CREATE OR REPLACE FUNCTION tg_b2b_products_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_b2b_products_updated_at ON b2b_products;
CREATE TRIGGER trg_b2b_products_updated_at
  BEFORE UPDATE ON b2b_products
  FOR EACH ROW EXECUTE FUNCTION tg_b2b_products_set_updated_at();

-- ============================================================
-- 2. b2b_product_market_links : 같은 SKU 가 여러 마켓에 등록된 경우
-- ============================================================
CREATE TABLE IF NOT EXISTS b2b_product_market_links (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         uuid NOT NULL REFERENCES b2b_products(id) ON DELETE CASCADE,
  marketplace        text NOT NULL,            -- 'coupang', 'smartstore', ...
  market_product_id  text NOT NULL,            -- 마켓의 상품 ID
  market_option      text,                     -- 마켓 옵션 (블랙/270mm 등)
  sale_price_krw     numeric(12,2),            -- 그 마켓에서 판매하는 가격
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, marketplace, market_product_id, market_option)
);

CREATE INDEX IF NOT EXISTS idx_b2b_product_market_links_product ON b2b_product_market_links(product_id);
CREATE INDEX IF NOT EXISTS idx_b2b_product_market_links_market ON b2b_product_market_links(marketplace, market_product_id);

-- ============================================================
-- 3. b2b_product_supplier_links : 해외 매입처 후보 (가격 비교 대비)
-- ============================================================
CREATE TABLE IF NOT EXISTS b2b_product_supplier_links (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id             uuid NOT NULL REFERENCES b2b_products(id) ON DELETE CASCADE,
  supplier_site          text NOT NULL,        -- 'amazon_us', 'rakuten', ...
  supplier_product_url   text,
  supplier_unit_price    numeric(12,4),        -- 해당 매입처 단가
  supplier_currency      text,                 -- USD/JPY 등
  is_primary             boolean NOT NULL DEFAULT false,  -- 가격 비교 시 기본 매입처
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_product_supplier_links_product ON b2b_product_supplier_links(product_id);

-- 하나의 product 에 is_primary=true 는 최대 1개
CREATE UNIQUE INDEX IF NOT EXISTS idx_b2b_product_supplier_links_one_primary
  ON b2b_product_supplier_links(product_id) WHERE is_primary = true;

-- ============================================================
-- 4. RLS — 본인 account 의 상품만
-- ============================================================
ALTER TABLE b2b_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_product_market_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_product_supplier_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_owner ON b2b_products;
CREATE POLICY products_owner ON b2b_products
  FOR ALL USING (
    account_id IN (SELECT id FROM b2b_accounts WHERE user_id = auth.uid())
  ) WITH CHECK (
    account_id IN (SELECT id FROM b2b_accounts WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS product_market_links_owner ON b2b_product_market_links;
CREATE POLICY product_market_links_owner ON b2b_product_market_links
  FOR ALL USING (
    product_id IN (
      SELECT id FROM b2b_products
      WHERE account_id IN (SELECT id FROM b2b_accounts WHERE user_id = auth.uid())
    )
  ) WITH CHECK (
    product_id IN (
      SELECT id FROM b2b_products
      WHERE account_id IN (SELECT id FROM b2b_accounts WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS product_supplier_links_owner ON b2b_product_supplier_links;
CREATE POLICY product_supplier_links_owner ON b2b_product_supplier_links
  FOR ALL USING (
    product_id IN (
      SELECT id FROM b2b_products
      WHERE account_id IN (SELECT id FROM b2b_accounts WHERE user_id = auth.uid())
    )
  ) WITH CHECK (
    product_id IN (
      SELECT id FROM b2b_products
      WHERE account_id IN (SELECT id FROM b2b_accounts WHERE user_id = auth.uid())
    )
  );
