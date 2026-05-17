-- P1: 배대지 양식 변환 — 하이브리드 모델 (공유 템플릿 + 사용자 정의)
-- 설계: _memory/p1-forwarder-export-design.md

-- ============================================================
-- 1. b2b_form_templates : 양식 정의
-- ============================================================
CREATE TABLE IF NOT EXISTS b2b_form_templates (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_account_id   uuid REFERENCES b2b_accounts(id) ON DELETE CASCADE,
  -- NULL = 공유 템플릿 (모든 셀러 SELECT, 운영자만 modify)
  -- NOT NULL = 해당 셀러 전용

  forwarder_id       uuid REFERENCES forwarders(id) ON DELETE SET NULL,
  name               text NOT NULL,
  source_file_path   text NOT NULL,
  source_file_size   integer,
  data_sheet_name    text NOT NULL,
  data_start_row     smallint NOT NULL DEFAULT 2,
  header_row_count   smallint NOT NULL DEFAULT 1,
  combine_rule       text,
  is_active          boolean NOT NULL DEFAULT true,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_form_templates_owner ON b2b_form_templates(owner_account_id);
CREATE INDEX IF NOT EXISTS idx_b2b_form_templates_forwarder ON b2b_form_templates(forwarder_id);

-- updated_at 트리거
CREATE OR REPLACE FUNCTION tg_b2b_form_templates_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_b2b_form_templates_updated_at ON b2b_form_templates;
CREATE TRIGGER trg_b2b_form_templates_updated_at
  BEFORE UPDATE ON b2b_form_templates
  FOR EACH ROW EXECUTE FUNCTION tg_b2b_form_templates_set_updated_at();

-- ============================================================
-- 2. b2b_form_template_columns : 컬럼 매핑
-- ============================================================
CREATE TABLE IF NOT EXISTS b2b_form_template_columns (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id        uuid NOT NULL REFERENCES b2b_form_templates(id) ON DELETE CASCADE,
  column_index       smallint NOT NULL,
  column_letter      text,
  column_label       text NOT NULL,
  source_kind        text NOT NULL CHECK (source_kind IN (
    'order_field','item_field','account_field','constant','composite','user_input','order_meta'
  )),
  source_path        text,
  composite_template text,
  constant_value     text,
  user_input_label   text,
  user_input_options text[],
  transform          text,
  required           boolean NOT NULL DEFAULT false,
  notes              text,
  UNIQUE (template_id, column_index)
);

CREATE INDEX IF NOT EXISTS idx_b2b_form_template_columns_tid ON b2b_form_template_columns(template_id);

-- ============================================================
-- 3. RLS
-- ============================================================
ALTER TABLE b2b_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_form_template_columns ENABLE ROW LEVEL SECURITY;

-- 공유 + 본인 소유 SELECT
DROP POLICY IF EXISTS templates_select ON b2b_form_templates;
CREATE POLICY templates_select ON b2b_form_templates
  FOR SELECT USING (
    owner_account_id IS NULL
    OR owner_account_id IN (SELECT id FROM b2b_accounts WHERE user_id = auth.uid())
  );

-- 본인 소유만 INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS templates_insert ON b2b_form_templates;
CREATE POLICY templates_insert ON b2b_form_templates
  FOR INSERT WITH CHECK (
    owner_account_id IN (SELECT id FROM b2b_accounts WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS templates_update ON b2b_form_templates;
CREATE POLICY templates_update ON b2b_form_templates
  FOR UPDATE USING (
    owner_account_id IN (SELECT id FROM b2b_accounts WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS templates_delete ON b2b_form_templates;
CREATE POLICY templates_delete ON b2b_form_templates
  FOR DELETE USING (
    owner_account_id IN (SELECT id FROM b2b_accounts WHERE user_id = auth.uid())
  );

-- columns 가시성은 templates 따라
DROP POLICY IF EXISTS template_columns_select ON b2b_form_template_columns;
CREATE POLICY template_columns_select ON b2b_form_template_columns
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM b2b_form_templates
      WHERE owner_account_id IS NULL
         OR owner_account_id IN (SELECT id FROM b2b_accounts WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS template_columns_modify ON b2b_form_template_columns;
CREATE POLICY template_columns_modify ON b2b_form_template_columns
  FOR ALL USING (
    template_id IN (
      SELECT id FROM b2b_form_templates
      WHERE owner_account_id IN (SELECT id FROM b2b_accounts WHERE user_id = auth.uid())
    )
  ) WITH CHECK (
    template_id IN (
      SELECT id FROM b2b_form_templates
      WHERE owner_account_id IN (SELECT id FROM b2b_accounts WHERE user_id = auth.uid())
    )
  );

-- ============================================================
-- 4. 짐패스 v1 시드
-- ============================================================
DO $$
DECLARE
  v_template_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_forwarder_id uuid;
BEGIN
  SELECT id INTO v_forwarder_id FROM forwarders WHERE slug = 'jimpass';

  INSERT INTO b2b_form_templates (
    id, owner_account_id, forwarder_id, name,
    source_file_path, data_sheet_name, data_start_row, header_row_count,
    combine_rule, notes
  ) VALUES (
    v_template_id, NULL, v_forwarder_id, '짐패스 v1 (공식)',
    'forwarder-templates/jimpass_v1.xlsx', '업로드양식', 2, 1,
    'jimpass_recipient',
    '짐패스 공식 업로드 양식 (xls → xlsx 변환됨, exceljs 호환). 같은 수취인명+연락처+우편번호 묶기. 고객사주문번호 있으면 그것 우선.'
  ) ON CONFLICT (id) DO NOTHING;

  -- 컬럼 26개
  INSERT INTO b2b_form_template_columns (template_id, column_index, column_letter, column_label, source_kind, source_path, composite_template, constant_value, user_input_label, user_input_options, transform, required, notes) VALUES
    (v_template_id, 1,  'A', '영문상품명',       'item_field',  'items[0].product_name', NULL, NULL, NULL, NULL, 'alnum_only', true, '한글 제거'),
    (v_template_id, 2,  'B', '품목분류코드',     'user_input',  NULL, NULL, '4', '품목분류코드', NULL, NULL, true, '기본 4 (일반잡화)'),
    (v_template_id, 3,  'C', '색상(영문)',       'user_input',  NULL, NULL, NULL, '색상 (영문)', NULL, NULL, false, '옵션'),
    (v_template_id, 4,  'D', '사이즈',           'user_input',  NULL, NULL, NULL, '사이즈', NULL, NULL, false, '옵션'),
    (v_template_id, 5,  'E', '수량',             'item_field',  'items[0].quantity', NULL, NULL, NULL, NULL, NULL, true, NULL),
    (v_template_id, 6,  'F', '해외 단가',        'item_field',  'items[0].unit_price_foreign', NULL, NULL, NULL, NULL, 'usd_2decimal', true, NULL),
    (v_template_id, 7,  'G', '브랜드/셀러',      'user_input',  NULL, NULL, NULL, '브랜드/셀러', NULL, NULL, false, NULL),
    (v_template_id, 8,  'H', '제품URL',          'item_field',  'items[0].product_url', NULL, NULL, NULL, NULL, NULL, false, NULL),
    (v_template_id, 9,  'I', '이미지URL',        'constant',    NULL, NULL, '', NULL, NULL, NULL, false, 'DB 미존재'),
    (v_template_id, 10, 'J', '현지주문번호',     'item_field',  'items[0].supplier_order_number', NULL, NULL, NULL, NULL, NULL, false, NULL),
    (v_template_id, 11, 'K', '현지트래킹넘버',   'constant',    NULL, NULL, '', NULL, NULL, NULL, false, 'DB 미존재'),
    (v_template_id, 12, 'L', '송장번호',         'constant',    NULL, NULL, '', NULL, NULL, NULL, false, '업로드 시 공란'),
    (v_template_id, 13, 'M', '고객사주문번호',   'order_field', 'order_number', NULL, NULL, NULL, NULL, NULL, false, NULL),
    (v_template_id, 14, 'N', '수취인명',         'order_field', 'buyer_name', NULL, NULL, NULL, NULL, NULL, true, NULL),
    (v_template_id, 15, 'O', '수취인 연락처',    'order_field', 'buyer_phone', NULL, NULL, NULL, NULL, 'phone_strip_dash', true, NULL),
    (v_template_id, 16, 'P', '우편번호',         'order_field', 'buyer_postal_code', NULL, NULL, NULL, NULL, NULL, true, NULL),
    (v_template_id, 17, 'Q', '주소',             'composite',   NULL, '{buyer_address} {buyer_detail_address}', NULL, NULL, NULL, NULL, true, NULL),
    (v_template_id, 18, 'R', '세관신고정보',     'order_field', 'buyer_customs_code', NULL, NULL, NULL, NULL, NULL, false, NULL),
    (v_template_id, 19, 'S', '포장보완',         'user_input',  NULL, NULL, NULL, '포장보완', ARRAY['Y'], NULL, false, NULL),
    (v_template_id, 20, 'T', '사업자통관',       'user_input',  NULL, NULL, NULL, '사업자통관', ARRAY['Y'], NULL, false, NULL),
    (v_template_id, 21, 'U', '입고담당자메모',   'order_field', 'request_notes', NULL, NULL, NULL, NULL, NULL, false, 'v0: request_notes 공용'),
    (v_template_id, 22, 'V', '택배사요청메모',   'user_input',  NULL, NULL, NULL, '택배사 요청 메모', NULL, NULL, false, NULL),
    (v_template_id, 23, 'W', '바로출고',         'user_input',  NULL, NULL, NULL, '바로출고', ARRAY['Y'], NULL, false, NULL),
    (v_template_id, 24, 'X', '실물검수',         'user_input',  NULL, NULL, NULL, '실물검수', ARRAY['Y'], NULL, false, NULL),
    (v_template_id, 25, 'Y', '현지택배사',       'user_input',  NULL, NULL, NULL, '현지택배사', ARRAY['야마토','사가와','우체국','아마존익스프레스','윌포트','라쿠텐','후쿠야마','세이노','에코하이','그 외'], NULL, false, NULL),
    (v_template_id, 26, 'Z', '해외 구매물품 보상보험', 'user_input', NULL, NULL, NULL, '해외 구매물품 보상보험', ARRAY['Y'], NULL, false, NULL)
  ON CONFLICT (template_id, column_index) DO NOTHING;
END $$;
