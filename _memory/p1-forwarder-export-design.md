# P1 — 배대지 양식 변환 설계 문서 (하이브리드 모델)

상태: **설계 v2 — 사용자 정의 + 공유 템플릿 하이브리드 / 구현 미시작**
작성: 2026-05-17 (세션 7)
갱신: 2026-05-17 (짐패스 v1 양식 분석 + 하이브리드 모델 반영)

---

## 0. 모델 선택 배경

세션 7 dogfood 후 사용자가 배대지 양식 다운로드를 시도해보니 **공식 양식 제공하는 배대지가 의외로 적었음**. 우리가 33개 spec 을 모두 수집·유지하는 모델은 비현실적.

**결정**: 하이브리드 모델
1. **공유 템플릿** (운영자 등록) — 우리가 양식 확보한 배대지는 직접 시드. 짐패스 v1 양식 분석 완료, 1호로 등록.
2. **사용자 정의 양식** — 셀러가 자기 배대지 양식 xlsx 업로드 → 컬럼 매핑 → 자기 계정에서만 사용.

원본 xlsx 를 **그대로 보존**해서 헤더 서식·도움말 시트 등을 유지하고, 우리는 **data 영역에만 row 를 채워서** 다운로드. 셀러가 배대지에 제출했을 때 양식 어긋남이 없도록.

---

## 1. 도메인 한 줄 요약

> 셀러의 마켓 주문(b2b_orders + b2b_order_items) 을 **선택한 양식(공유 템플릿 또는 본인이 업로드한 양식)** 의 data 영역에 자동 채워서 XLSX 다운로드.

---

## 2. DB 스키마

### 2.1 `b2b_form_templates` — 양식 정의 (공유 + 사용자 정의 모두)

```sql
CREATE TABLE b2b_form_templates (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_account_id   uuid REFERENCES b2b_accounts(id) ON DELETE CASCADE,
  -- NULL = 공유 템플릿 (모든 셀러 접근 가능, 운영자만 편집)
  -- NOT NULL = 해당 셀러 전용

  forwarder_id       uuid REFERENCES forwarders(id) ON DELETE SET NULL,
  -- 배대지에 묶이지만 nullable — 사용자 정의의 경우 셀러가 임시 배대지 만들기도 가능

  name               text NOT NULL,
  -- "짐패스 v1 (공식)" / "내 짐패스 양식" / "직구직구 임시" 등

  source_file_path   text NOT NULL,
  -- Supabase Storage path: 'forwarder-templates/jimpass_v1.xls'
  -- 또는 사용자 정의: 'user-templates/{account_id}/{template_id}/{filename}'

  source_file_size   integer,
  data_sheet_name    text NOT NULL,
  -- 여러 시트가 있을 때 데이터를 채울 시트 이름. 짐패스 = '업로드양식'

  data_start_row     smallint NOT NULL DEFAULT 2,
  -- 헤더 다음 row. 짐패스 = 2 (R1 헤더)

  header_row_count   smallint NOT NULL DEFAULT 1,

  combine_rule       text,
  -- '같은 수취인 묶기' 등의 합배송 룰 식별자 (jimpass_recipient | jimpass_order_number | none)

  is_active          boolean NOT NULL DEFAULT true,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_b2b_form_templates_owner ON b2b_form_templates(owner_account_id);
CREATE INDEX idx_b2b_form_templates_forwarder ON b2b_form_templates(forwarder_id);
```

### 2.2 `b2b_form_template_columns` — 컬럼 매핑

```sql
CREATE TABLE b2b_form_template_columns (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id        uuid NOT NULL REFERENCES b2b_form_templates(id) ON DELETE CASCADE,
  column_index       smallint NOT NULL,        -- 1부터, 양식 컬럼 순서
  column_letter      text,                     -- 'A', 'B', ... (옵션, 디버그용)
  column_label       text NOT NULL,            -- 헤더 라벨 ("수취인명")

  source_kind        text NOT NULL,
  -- 'order_field' | 'item_field' | 'account_field' | 'constant' | 'composite' | 'user_input' | 'order_meta'

  source_path        text,
  -- 'buyer_name' / 'items[0].product_name' / 'business_name' 등

  composite_template text,
  -- '{buyer_address} {buyer_detail_address}'

  constant_value     text,
  -- '' (송장번호처럼 빈값 강제) 또는 '4' (default 품목코드)

  user_input_label   text,
  -- source_kind='user_input' 일 때 사용자에게 물어볼 라벨 — '브랜드/셀러를 입력하세요'

  user_input_options text[],
  -- enum 옵션 — 현지택배사처럼 ['야마토','사가와',...]

  transform          text,
  -- 'upper' | 'lower' | 'phone_strip_dash' | 'phone_intl' | 'krw_format' | 'usd_2decimal' | 'customs_strip_p' | 'alnum_only'

  required           boolean NOT NULL DEFAULT false,
  notes              text,
  UNIQUE (template_id, column_index)
);

CREATE INDEX idx_b2b_form_template_columns_tid ON b2b_form_template_columns(template_id);
```

### 2.3 RLS

```sql
ALTER TABLE b2b_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_form_template_columns ENABLE ROW LEVEL SECURITY;

-- 셀러: 공유 템플릿 + 자기 소유 템플릿 SELECT
CREATE POLICY templates_select ON b2b_form_templates
  FOR SELECT USING (
    owner_account_id IS NULL
    OR owner_account_id IN (SELECT id FROM b2b_accounts WHERE user_id = auth.uid())
  );

-- 셀러: 본인 템플릿만 INSERT/UPDATE/DELETE (공유는 service_role 만)
CREATE POLICY templates_modify ON b2b_form_templates
  FOR ALL USING (
    owner_account_id IN (SELECT id FROM b2b_accounts WHERE user_id = auth.uid())
  );

-- columns 는 templates 가시성 따라
CREATE POLICY template_columns_select ON b2b_form_template_columns
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM b2b_form_templates
      WHERE owner_account_id IS NULL
         OR owner_account_id IN (SELECT id FROM b2b_accounts WHERE user_id = auth.uid())
    )
  );

CREATE POLICY template_columns_modify ON b2b_form_template_columns
  FOR ALL USING (
    template_id IN (
      SELECT id FROM b2b_form_templates
      WHERE owner_account_id IN (SELECT id FROM b2b_accounts WHERE user_id = auth.uid())
    )
  );
```

### 2.4 마이그 파일

```
supabase/b2b_form_templates.sql
```

Supabase MCP `apply_migration` 으로 직접 적용.

### 2.5 Storage 버킷

- `forwarder-templates` (public read, service_role write) — 공유 템플릿 원본 xlsx
- `user-templates` (셀러 RLS — 자기 폴더만) — 사용자 정의 원본 xlsx

---

## 3. API

### 3.1 `POST /api/orders/[id]/export`

```typescript
// body: { template_id: string, user_inputs?: Record<string, string> }
// user_inputs: source_kind='user_input' 컬럼들의 값 (예: { brand: 'GAP', 포장보완: 'Y' })
//
// 흐름:
// 1. order + items + account 조회 (RLS)
// 2. template + columns 조회 (RLS)
// 3. Storage 에서 원본 xlsx 다운로드
// 4. exceljs 로 열고 data_sheet_name 시트 선택
// 5. data_start_row 부터 각 컬럼에 평가된 값 채우기
// 6. buffer → response (Content-Type=application/vnd.openxmlformats..., filename={template_name}_{date}.xlsx)
```

### 3.2 `POST /api/orders/export-bulk` (v0.5)

여러 주문 → 합배송 룰 적용 → 같은 양식의 여러 row.

### 3.3 `POST /api/form-templates` (사용자 정의 양식 업로드)

```typescript
// FormData: file (xlsx), name, forwarder_id (optional)
//
// 1. xlsx 파일 → exceljs 로 파싱
// 2. 시트 목록 + 첫 시트의 첫 행 헤더 추출
// 3. Storage 에 업로드
// 4. b2b_form_templates row 생성 (owner_account_id = 현재 셀러)
// 5. 헤더 라벨로 b2b_form_template_columns 자동 생성 (source_kind 는 'user_input' 으로 기본)
// 6. 셀러가 매핑 UI 에서 source_kind 와 source_path 편집
```

### 3.4 `PATCH /api/form-templates/[id]/columns`

매핑 편집 (사용자 정의 템플릿 + 공유 템플릿 fork).

### 3.5 `POST /api/form-templates/[id]/fork`

공유 템플릿을 자기 계정으로 복사해서 매핑 수정 (예: 짐패스 양식을 자기 식대로 커스터마이즈).

---

## 4. UI 컴포넌트

### 4.1 `ForwarderExportModal.tsx`

```
src/components/b2b/ForwarderExportModal.tsx
```

- 트리거: `/orders/[id]` 사이드바 "배대지 양식으로 변환" 버튼
- 흐름:
  1. 템플릿 선택 dropdown — 그룹: 공유 (짐패스 v1...) / 내 양식
  2. 미리보기 — 컬럼별로 채워질 값 + 사용자 입력 필요한 항목 폼
  3. 누락 경고 — 통관코드 비어있음, 영문상품명 한글만 있음 등
  4. "XLSX 다운로드" 버튼

### 4.2 `/templates` 페이지 (v0.5)

- 사용자 정의 양식 목록
- 양식 업로드 → 매핑 편집 UI
- 공유 템플릿 fork 옵션

### 4.3 `TemplateMappingEditor.tsx` (v0.5)

매핑 편집 — 양식의 헤더 행 각 컬럼에 대해:
- source_kind 선택 (드롭다운)
- source_path 또는 user_input_label 입력
- transform 선택
- 미리보기 (이 주문에 적용 시 어떤 값이 들어갈지)

---

## 5. xlsx 라이브러리

**`exceljs`** 채택. 이유:
- 시트 단위 수정 가능 (짐패스의 "업로드양식" 시트만 채우고 "도움말" 시트 유지)
- 셀 스타일·병합 보존
- TypeScript 친화

설치: `npm i exceljs`

---

## 6. source_path DSL

`b2b_form_template_columns.source_path` 평가:

| source_kind | source_path 예시 | 평가 결과 |
|---|---|---|
| `order_field` | `order_number` | order.order_number |
| `order_field` | `buyer_name` | order.buyer_name |
| `order_field` | `buyer_phone` | order.buyer_phone |
| `order_field` | `buyer_postal_code` | order.buyer_postal_code |
| `order_field` | `buyer_customs_code` | order.buyer_customs_code |
| `order_field` | `request_notes` | order.request_notes |
| `item_field` | `items[0].product_name` | items[0].product_name |
| `item_field` | `items[0].quantity` | items[0].quantity |
| `item_field` | `items[0].unit_price_foreign` | items[0].unit_price_foreign |
| `item_field` | `items[0].product_url` | items[0].product_url |
| `item_field` | `items[0].supplier_order_number` | items[0].supplier_order_number |
| `item_field` | `items[0].market_option` | items[0].market_option |
| `account_field` | `business_name` | account.business_name |
| `account_field` | `phone` | account.phone |
| `composite` | (template) | placeholder 치환 |
| `constant` | (constant_value) | constant_value |
| `user_input` | (user_input_label) | API body 의 user_inputs[key] |
| `order_meta` | `today` / `now` | 현재 시각 |

### composite_template 문법

`{field}` placeholder 치환 (order/items[0]/account 모든 필드 접근 가능):
- `{buyer_address} {buyer_detail_address}` → "서울 강남구 테헤란로 123 5층 501호"
- `{items[0].product_name} x{items[0].quantity}` → "Anker PowerCore x1"

### transform

| value | 동작 |
|---|---|
| `upper` | 영문 대문자 |
| `lower` | 영문 소문자 |
| `phone_strip_dash` | "010-1234-5678" → "01012345678" |
| `phone_intl` | "010-1234-5678" → "+82 10 1234 5678" |
| `krw_format` | 89000 → "89,000" |
| `usd_2decimal` | 45.99 → "45.99" |
| `customs_strip_p` | "P123456789012" → "123456789012" |
| `alnum_only` | 한글·특수문자 제거 (짐패스 영문상품명용) |

---

## 7. 짐패스 v1 시드 (실 spec)

원본 파일: `supabase/forwarder-templates/jimpass_v1.xls` (commit 됨)

**시트**: `업로드양식` (data), `도움말` (보존)
**data_start_row**: 2
**combine_rule**: `jimpass_recipient` (같은 수취인명+연락처+우편번호 묶기, 고객사주문번호 우선)

### 컬럼 매핑 (26개)

| # | 라벨 | source_kind | source_path / 비고 |
|---|---|---|---|
| 1 | 영문상품명 | item_field + transform=alnum_only | `items[0].product_name` |
| 2 | 품목분류코드 | user_input | label: 품목분류코드 (default '4') |
| 3 | 색상(영문) | user_input | label: 색상 (영문) — 옵션 |
| 4 | 사이즈 | user_input | label: 사이즈 — 옵션 |
| 5 | 수량 | item_field | `items[0].quantity` |
| 6 | 해외 단가 | item_field + transform=usd_2decimal | `items[0].unit_price_foreign` |
| 7 | 브랜드/셀러 | user_input | label: 브랜드/셀러 |
| 8 | 제품URL | item_field | `items[0].product_url` |
| 9 | 이미지URL | constant | `''` (DB 미존재) |
| 10 | 현지주문번호 | item_field | `items[0].supplier_order_number` |
| 11 | 현지트래킹넘버 | constant | `''` (DB 미존재) |
| 12 | 송장번호 | constant | `''` (도움말: 업로드 시 공란) |
| 13 | 고객사주문번호 | order_field | `order_number` |
| 14 | 수취인명 | order_field | `buyer_name` |
| 15 | 수취인 연락처 | order_field | `buyer_phone` |
| 16 | 우편번호 | order_field | `buyer_postal_code` |
| 17 | 주소 | composite | `{buyer_address} {buyer_detail_address}` |
| 18 | 세관신고정보 | order_field | `buyer_customs_code` |
| 19 | 포장보완 | user_input | enum: ['Y', ''] |
| 20 | 사업자통관 | user_input | enum: ['Y', ''] |
| 21 | 입고담당자메모 | order_field | `request_notes` (또는 별도 신규 컬럼) |
| 22 | 택배사요청메모 | user_input | label: 택배사 요청 메모 |
| 23 | 바로출고 | user_input | enum: ['Y', ''] |
| 24 | 실물검수 | user_input | enum: ['Y', ''] |
| 25 | 현지택배사 | user_input | enum: ['야마토','사가와','우체국','아마존익스프레스','윌포트','라쿠텐','후쿠야마','세이노','에코하이','그 외'] |
| 26 | 해외 구매물품 보상보험 | user_input | enum: ['Y', ''] |

### 시드 SQL (마이그 안에 INSERT)

```sql
-- 짐패스 v1 공유 템플릿
INSERT INTO b2b_form_templates (id, owner_account_id, forwarder_id, name, source_file_path, data_sheet_name, data_start_row, header_row_count, combine_rule, notes)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  NULL,
  (SELECT id FROM forwarders WHERE slug='jimpass'),
  '짐패스 v1 (공식)',
  'forwarder-templates/jimpass_v1.xls',
  '업로드양식',
  2,
  1,
  'jimpass_recipient',
  '짐패스 공식 업로드 양식. 같은 수취인명+연락처+우편번호 묶기. 고객사주문번호 있으면 그것 우선.'
);

-- 26 컬럼은 마이그 작성 시 일괄 INSERT
```

---

## 8. 빌드 단계 (다음 세션 권장 순서)

1. **DB 마이그**: `supabase/b2b_form_templates.sql` 작성 + Supabase MCP `apply_migration`
2. **Storage 셋업**: `forwarder-templates` 버킷 생성 + `user-templates` 버킷 생성
3. **시드 1**: 짐패스 v1 row + 26 컬럼 INSERT + `jimpass_v1.xls` 를 `forwarder-templates/` 버킷에 업로드
4. **라이브러리**: `npm i exceljs`
5. **유틸**: `src/lib/b2b/forwarder-export.ts` (source_path 평가기 + composite + transform + 합배송 묶기)
6. **API**: `src/app/api/orders/[id]/export/route.ts` (단일 주문)
7. **모달 컴포넌트**: `src/components/b2b/ForwarderExportModal.tsx`
8. **상세 사이드바 버튼 활성**: `/orders/[id]` 의 disabled 제거
9. **e2e 검증**: dogfood 의 COUPANG-26051700123 주문 → 짐패스 v1 변환 → 양식 정확도 검토
10. **사용자 정의 양식 업로드**: `POST /api/form-templates` + `/templates` 페이지 + 매핑 에디터

### 짧은 사용자 협업 포인트

- 입고담당자메모 / 택배사요청메모 — `request_notes` 하나로 합칠지 별도 컬럼 둘지 결정 (v0 권장: `request_notes` 만 사용, v0.5 분리)
- 영문상품명 자동 번역 (papago/google) 도 v0.5+ 검토 — 현재는 alnum_only transform 으로 한글 제거만

---

## 9. 미구현 (P1+1 단계)

- 다중 시트 양식 (여러 sheet 채우기)
- N 개 주문 → 1 파일 합배송 자동 묶기 (`/api/orders/export-bulk`)
- 양식 업로드 시 AI 로 자동 매핑 추정
- 양식 fork (공유 → 개인 복사)
- `b2b_order_items` 에 `image_url`, `tracking_number_overseas` 컬럼 추가
- 영문상품명 자동 번역
- 양식 버전 관리 (v1 / v2)
