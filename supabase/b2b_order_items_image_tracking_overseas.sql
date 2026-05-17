-- b2b_order_items: 짐패스 양식 9·11 컬럼용 (이미지 URL + 현지 트래킹)
-- 적용: Supabase MCP apply_migration (b2b_order_items_image_url_tracking_overseas)

ALTER TABLE b2b_order_items
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS tracking_number_overseas text;

COMMENT ON COLUMN b2b_order_items.image_url IS '상품 이미지 URL — 짐패스 양식 9컬럼용';
COMMENT ON COLUMN b2b_order_items.tracking_number_overseas IS '해외 매입처 → 배대지 사이의 현지 트래킹 번호 — 짐패스 양식 11컬럼용';

-- 짐패스 v1 시드 컬럼 매핑 갱신 (constant '' → item_field)
UPDATE b2b_form_template_columns
SET source_kind = 'item_field',
    source_path = 'items[0].image_url',
    constant_value = NULL,
    notes = '상품 이미지 URL — b2b_order_items.image_url'
WHERE template_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND column_index = 9;

UPDATE b2b_form_template_columns
SET source_kind = 'item_field',
    source_path = 'items[0].tracking_number_overseas',
    constant_value = NULL,
    notes = '현지 트래킹 — b2b_order_items.tracking_number_overseas'
WHERE template_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND column_index = 11;
