# P1 — 33 배대지 양식 변환 설계 문서

상태: **설계 완료 / 구현 미시작**
작성: 2026-05-17 (세션 7)

---

## 1. 도메인 한 줄 요약

> 셀러가 등록한 마켓 주문(b2b_orders + b2b_order_items) 을 **선택한 배대지의 신청서 양식(XLSX)** 으로 자동 변환해서 다운로드.

수신자 칸 = 마켓 구매자 PII (b2b_orders.buyer_*), 상품 칸 = 해외 매입 정보 (b2b_order_items), 신청자 칸 = 셀러 계정 정보 (b2b_accounts).

**가치**: 셀러가 5분 걸리던 양식 채우기를 30초로 단축. v0 의 핵심 가치 그 자체.

---

## 2. DB 스키마

### 2.1 `b2b_forwarder_form_specs` (배대지 양식 정의)

각 배대지의 신청서 컬럼 1개당 1 row. 한 배대지가 N 개 컬럼 정의를 가짐.

```sql
CREATE TABLE b2b_forwarder_form_specs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forwarder_id     uuid NOT NULL REFERENCES forwarders(id) ON DELETE CASCADE,
  column_index    smallint NOT NULL,           -- 양식 내 컬럼 순서 (1부터)
  column_letter    text,                       -- 엑셀 컬럼 letter (A, B, ...) — 옵션
  column_label    text NOT NULL,               -- 헤더에 표시될 라벨 ("받으시는 분 성함" 등)
  source_kind      text NOT NULL,              -- 'order_field' | 'item_field' | 'account_field' | 'constant' | 'composite'
  source_path     text,                        -- source_kind 가 *_field 일 때 — 예: 'buyer_name', 'items[0].product_name'
  composite_template text,                     -- source_kind='composite' 일 때 — 예: '{buyer_address} {buyer_detail_address}'
  constant_value   text,                       -- source_kind='constant' 일 때 — 예: '직배송'
  transform        text,                       -- 'upper' | 'lower' | 'phone_strip_dash' | 'krw_format' | null
  required         boolean NOT NULL DEFAULT false,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (forwarder_id, column_index)
);

CREATE INDEX idx_b2b_forwarder_form_specs_fid ON b2b_forwarder_form_specs(forwarder_id);
```

### 2.2 (옵션) `b2b_forwarder_form_templates` — 양식 메타

```sql
CREATE TABLE b2b_forwarder_form_templates (
  forwarder_id    uuid PRIMARY KEY REFERENCES forwarders(id) ON DELETE CASCADE,
  template_name   text NOT NULL,              -- "짐패스 표준 신청서 v2026"
  header_rows     smallint NOT NULL DEFAULT 1, -- 양식 상단 header rows (data 시작 row 계산)
  filename_pattern text,                       -- 'jimpass_{date}_{count}.xlsx'
  notes           text,
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

### 2.3 마이그 파일

```
supabase/b2b_forwarder_form_specs.sql
```

DDL + 첫 시드 (1~3 배대지 — 짐패스/몰테일/이지타오 등 main repo 시드 기준 인기). Supabase MCP `apply_migration` 으로 직접 적용.

---

## 3. API

### 3.1 `POST /api/orders/[id]/export`

선택한 배대지로 단일 주문 → XLSX 변환.

```typescript
// src/app/api/orders/[id]/export/route.ts

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // body: { forwarder_id: string }
  // 1. order + items + account 조회 (RLS 검증)
  // 2. forwarder_form_specs 조회
  // 3. source_path 평가 → row 데이터 생성
  // 4. xlsx 패키지로 buffer 생성 (헤더 1행 + 데이터 1행)
  // 5. response: Content-Type=application/vnd.openxmlformats-... + filename
}
```

### 3.2 `POST /api/orders/export-bulk` (v0.5)

N 개 주문을 같은 배대지 양식으로 일괄 변환 (한 파일 또는 zip).

### 3.3 `GET /api/forwarders/[id]/spec` (옵션)

UI 미리보기용 — 어떤 컬럼이 채워지는지 사전 확인.

---

## 4. UI 컴포넌트

### 4.1 `ForwarderExportModal.tsx`

```
src/components/b2b/ForwarderExportModal.tsx
```

- 트리거: `/orders/[id]` 사이드바의 "배대지 양식으로 변환" 버튼 (현재 disabled)
- props: `orderId`, `defaultForwarderId` (주문에 연결된 배대지)
- 내용:
  - 배대지 선택 dropdown (다른 배대지로 변환 가능)
  - 미리보기: 어떤 컬럼이 어떤 값으로 채워질지 한눈에
  - 누락 필드 경고 (예: 통관코드 비어있음)
  - "XLSX 다운로드" 버튼

### 4.2 `/forwarders` (v0.5)

- 등록된 33 배대지 카드 그리드
- 각 카드에 양식 spec 등록 여부 표시
- 운영자만 spec 편집 가능 (셀러는 보기만)

---

## 5. xlsx 변환 라이브러리

옵션:
- **`xlsx`** (SheetJS) — 가장 널리 쓰임. CJS/ESM 호환.
- **`exceljs`** — TypeScript 친화. 스타일링 강함.
- **`@e965/xlsx`** — community SheetJS fork.

추천: **`exceljs`** — 셀 스타일·결합·color 모두 지원, 배대지 양식의 헤더 색상/병합 재현 가능.

설치:
```bash
npm i exceljs
```

---

## 6. source_path DSL (mini-language)

`b2b_forwarder_form_specs.source_path` 의 평가 규칙:

| source_kind | source_path 예시 | 평가 결과 |
|---|---|---|
| `order_field` | `order_number` | order.order_number |
| `order_field` | `buyer_name` | order.buyer_name |
| `order_field` | `buyer_address` | order.buyer_address |
| `item_field` | `items[0].product_name` | items[0].product_name |
| `item_field` | `items[0].unit_price_foreign` | items[0].unit_price_foreign |
| `account_field` | `business_name` | account.business_name |
| `composite` | (template 사용) | 아래 |
| `constant` | (constant_value 사용) | constant_value |

### composite_template 문법

`{field}` placeholder 치환:
- `{buyer_address} {buyer_detail_address}` → "서울 강남구 테헤란로 123 5층 501호"
- `{items[0].product_name} x{items[0].quantity}` → "Anker PowerCore x1"
- `{currency} {unit_price_foreign}` → "USD 45.99"

### transform

| value | 동작 |
|---|---|
| `upper` | 영문 대문자 |
| `lower` | 영문 소문자 |
| `phone_strip_dash` | "010-1234-5678" → "01012345678" |
| `phone_intl` | "010-1234-5678" → "+82 10 1234 5678" |
| `krw_format` | 89000 → "89,000" |
| `usd_2decimal` | 45.99 → "45.99" |
| `customs_code_strip_p` | "P123456789012" → "123456789012" (배대지가 P 빼고 받는 경우) |

---

## 7. 시드 데이터 (3 배대지 예시)

세션 8 진입 시 사용자가 배대지 신청서 컬럼을 정확히 공유한 후 마이그레이션. 아래는 가상 예시 (실제와 다를 수 있음):

```sql
-- 짐패스 (가상 예시)
INSERT INTO b2b_forwarder_form_specs (forwarder_id, column_index, column_label, source_kind, source_path) VALUES
  ((SELECT id FROM forwarders WHERE slug='jimpass'),  1, '받는분 성함',     'order_field',   'buyer_name'),
  ((SELECT id FROM forwarders WHERE slug='jimpass'),  2, '받는분 연락처',   'order_field',   'buyer_phone'),
  ((SELECT id FROM forwarders WHERE slug='jimpass'),  3, '우편번호',         'order_field',   'buyer_postal_code'),
  ((SELECT id FROM forwarders WHERE slug='jimpass'),  4, '주소',             'composite',     null),
  ((SELECT id FROM forwarders WHERE slug='jimpass'),  5, '개인통관고유부호','order_field',   'buyer_customs_code'),
  ((SELECT id FROM forwarders WHERE slug='jimpass'),  6, '상품명',           'item_field',    'items[0].product_name'),
  ((SELECT id FROM forwarders WHERE slug='jimpass'),  7, '수량',             'item_field',    'items[0].quantity'),
  ((SELECT id FROM forwarders WHERE slug='jimpass'),  8, '단가(USD)',        'item_field',    'items[0].unit_price_foreign'),
  ((SELECT id FROM forwarders WHERE slug='jimpass'),  9, '신청자',           'account_field', 'business_name'),
  ((SELECT id FROM forwarders WHERE slug='jimpass'), 10, '신청자 연락처',   'account_field', 'phone');
```

composite_template 예시:
- column 4 (주소): `{buyer_address} {buyer_detail_address}`

---

## 8. 빌드 단계 (다음 세션 권장 순서)

1. **DB**: `supabase/b2b_forwarder_form_specs.sql` 마이그 작성 + Supabase MCP `apply_migration`
2. **라이브러리**: `npm i exceljs` + types
3. **유틸**: `src/lib/b2b/forwarder-export.ts` — source_path 평가기 + composite 치환 + transform 적용
4. **API**: `src/app/api/orders/[id]/export/route.ts` — 단일 주문 변환
5. **컴포넌트**: `src/components/b2b/ForwarderExportModal.tsx`
6. **상세 페이지**: `/orders/[id]` 사이드바 버튼 활성 + 모달 트리거
7. **시드 1개 추가** (짐패스 정도) → e2e 검증
8. **시드 2~5개 추가** (사용자가 양식 공유한 배대지부터)

---

## 9. 사용자 협업 요청 (양식 spec 수집)

다음 세션 진입 전 사용자가 다음 정보 수집 (배대지 3~5개부터):

### 배대지별로:

1. **신청서 양식 파일** (실제 XLSX 또는 PDF)
2. **컬럼 목록** (1~N 번 순서대로):
   - 라벨 (예: "받는분 성함")
   - 필수/선택 여부
   - 입력 예시
3. **특수 규칙**:
   - 통관코드 P 포함 여부
   - 전화번호 형식 (010-XXXX-XXXX vs 01012345678 vs +82)
   - 주소 결합 방식 (기본+상세 한 줄 vs 분리)
   - 금액 표시 (USD 그대로 vs KRW 환산)

### 우선순위 추천

main repo forwarders 시드 (10개) 중 인기:
1. 짐패스
2. 몰테일
3. 이지타오
4. 유니옥션
5. 비드팟

다음 세션 1순위 = 위 5개 중 사용자가 양식 확보한 것부터.

---

## 10. 미구현 (P1+1 단계)

- `/forwarders` 페이지에서 운영자가 직접 spec 편집
- 다중 시트 양식 (한 양식에 여러 sheet)
- 셀 병합·색상 등 시각적 양식 재현
- 일괄 export (N 개 주문 → 1 파일 / zip)
- 양식 파일 업로드 → 자동 spec 추출 (AI)
