-- ============================================================================
-- 짐스캐너 B2B — 도메인 재정의 마이그레이션 (2026-05-15)
--
-- 배경: 기존 "구매대행 사업자 ↔ 의뢰자" 가설을 폐기하고,
-- "국내 마켓 셀러 ↔ 마켓 구매자, 해외 매입 → 배대지 → 구매자 배송"
-- 도메인으로 재정의. b2b_orders 와 b2b_order_items 에 마켓 메타데이터,
-- 구매자 PII, 해외 매입 메타데이터를 직접 저장하도록 컬럼 추가.
--
-- 적용 후 코드 변경:
--   /api/orders POST/GET, /orders/new, /orders, /orders/[id]
--   PATCH /api/orders/[id]/status (선택 컬럼 정정)
--
-- 데이터 호환성:
--   기존 등록된 주문(b2b_clients 매핑 포함)은 buyer_* / marketplace 가
--   비어있는 상태로 남게 됨. UI 는 null 을 "미입력" 으로 표시. 이미 등록된
--   레거시 1건은 dogfood 단계 데이터라 영향 무시.
-- ============================================================================

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) b2b_orders — 마켓 + 구매자 메타데이터
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.b2b_orders
  add column if not exists marketplace text,
  add column if not exists market_order_number text,
  add column if not exists buyer_name text,
  add column if not exists buyer_phone text,
  add column if not exists buyer_postal_code text,
  add column if not exists buyer_address text,
  add column if not exists buyer_detail_address text,
  add column if not exists buyer_customs_code text,
  -- 마켓 사이드 부가 정보
  add column if not exists market_commission_krw bigint,
  add column if not exists shipping_fee_krw bigint;

-- 마켓 코드 검증 — 자유 텍스트지만 화이트리스트 권장.
-- 새 마켓 추가는 이 check 제약을 alter 해야 하므로 일단 nullable 만 유지.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'b2b_orders_marketplace_check'
  ) then
    alter table public.b2b_orders
      add constraint b2b_orders_marketplace_check
      check (
        marketplace is null
        or marketplace in (
          'coupang', 'smartstore', 'auction', 'gmarket', '11st',
          'interpark', 'wemakeprice', 'tmon', 'kakao_gift',
          'own_mall', 'kakao_channel', 'instagram', 'other'
        )
      );
  end if;
end $$;

-- 같은 사업자 안에서 (marketplace, market_order_number) 는 unique
-- (한 마켓에서 같은 주문번호가 들어오는 일은 정상적으로 없음)
create unique index if not exists uniq_b2b_orders_marketplace_order_no
  on public.b2b_orders(account_id, marketplace, market_order_number)
  where marketplace is not null
    and market_order_number is not null
    and deleted_at is null;

create index if not exists idx_b2b_orders_marketplace
  on public.b2b_orders(account_id, marketplace) where deleted_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) b2b_order_items — 해외 매입처 + 판매가 (마진 계산)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.b2b_order_items
  -- SKU 마스터 참조 (v0 에선 null 허용, v0.5 에서 b2b_products 테이블과 함께 활성)
  add column if not exists product_id uuid,
  -- 해외 매입처 메타
  add column if not exists supplier_site text,
  add column if not exists supplier_order_number text,
  add column if not exists supplier_purchased_at timestamptz,
  -- 판매가 (마진 계산용)
  add column if not exists sale_price_krw bigint,
  -- 마켓별 상품 식별 (어떤 마켓 상품과 매칭됐는지)
  add column if not exists market_product_id text,
  add column if not exists market_option text;

-- 해외 사이트 화이트리스트 (자유 추가 가능)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'b2b_order_items_supplier_site_check'
  ) then
    alter table public.b2b_order_items
      add constraint b2b_order_items_supplier_site_check
      check (
        supplier_site is null
        or supplier_site in (
          'amazon_us', 'amazon_jp', 'amazon_de', 'amazon_uk', 'amazon_ca',
          'rakuten_jp', 'yahoo_jp', 'mercari_jp', 'zozotown',
          'taobao', 'tmall', 'aliexpress', 'jd', 'pinduoduo',
          'ebay', 'walmart', 'target',
          'shopee', 'lazada',
          'farfetch', 'ssense', 'matchesfashion', 'mytheresa',
          'other'
        )
      );
  end if;
end $$;

create index if not exists idx_b2b_items_supplier
  on public.b2b_order_items(supplier_site)
  where supplier_site is not null;

create index if not exists idx_b2b_items_product
  on public.b2b_order_items(product_id)
  where product_id is not null;

commit;

-- ============================================================================
-- 검증 (수동)
-- ============================================================================
-- select column_name, data_type, is_nullable
--   from information_schema.columns
--  where table_schema = 'public'
--    and table_name in ('b2b_orders', 'b2b_order_items')
--    and column_name in (
--      'marketplace','market_order_number','buyer_name','buyer_phone',
--      'buyer_postal_code','buyer_address','buyer_detail_address','buyer_customs_code',
--      'market_commission_krw','shipping_fee_krw',
--      'product_id','supplier_site','supplier_order_number','supplier_purchased_at',
--      'sale_price_krw','market_product_id','market_option'
--    )
--  order by table_name, ordinal_position;
