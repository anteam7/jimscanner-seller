-- #idea-11 통관 가이드 inline hint — 주문 생성 시 카테고리 자동 매칭
-- 적용: 2026-05-29 (Supabase MCP apply_migration b2b_order_items_customs_category)
--
-- b2b_order_items 에 customs_category (해외직구 통관 분류) 컬럼 추가.
-- 기존 free-text `category` (상품 분류, 예: '뷰티 / 스킨케어') 와는 구분:
--   customs_category 는 KCS 통관 가이드 (src/lib/b2b/customs-guide.ts CUSTOMS_GUIDES) 와
--   1:1 매칭되는 제약 enum. 주문 입력 시 상품명 keyword 로 자동 인식하거나 수동 선택.

ALTER TABLE public.b2b_order_items
  ADD COLUMN IF NOT EXISTS customs_category text;

ALTER TABLE public.b2b_order_items
  DROP CONSTRAINT IF EXISTS b2b_order_items_customs_category_check;

ALTER TABLE public.b2b_order_items
  ADD CONSTRAINT b2b_order_items_customs_category_check
  CHECK (
    customs_category IS NULL OR customs_category IN (
      'food','cosmetic','electronics','clothing','kids',
      'health','watch','alcohol','tobacco','home','other'
    )
  );

COMMENT ON COLUMN public.b2b_order_items.customs_category IS
  '해외직구 통관 분류 (KCS 가이드 매칭). 주문 입력 시 상품명 keyword 자동 인식 또는 수동 선택. src/lib/b2b/customs-guide.ts CUSTOMS_GUIDES 와 1:1.';
