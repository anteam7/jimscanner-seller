# 다음 작업 우선순위 큐

마지막 갱신: 2026-05-16 (일괄 입력 기능 추가)

---

## ⚠️ 도메인 재정의 (2026-05-15, dogfood 직후)

기존 전제(구매대행 사업자 ← 의뢰자) 가 **잘못** 이었음. 실제는:

**셀러는 국내 마켓(쿠팡·스마트스토어·옥션·지마켓·자사몰)에서 주문이 들어오면, 해외(미국아마존·일본아마존·라쿠텐·타오바오 등)에서 매입하고, 33 배대지 중 1개를 골라서 한국으로 받아 마켓 구매자에게 배송.**

핵심 변화:
- "의뢰자" 폐기 → "마켓 구매자(buyer)" — 1회성 PII가 주문에 직접 포함 (배대지 양식의 수신자)
- 마켓·마켓주문번호가 1차 식별자
- 한 마켓 주문 = N개 해외 매입 (라인 아이템마다 supplier_site)
- SKU 매칭은 선택사항 (선등록/즉석등록/없이 모두 가능)
- 양식 변환의 입력값: 구매자 주소 + 매입 상품 정보 + 매입 사이트

---

## 🥇 1순위 — dogfood 검증 (2 트랙)

세션 5(Phase A~D, 도메인 재정의) + 세션 6(일괄 입력) 모두 prod 반영 완료, **실 데이터 검증 미실행**. 다음 세션 시작 시 둘 중 하나 또는 둘 다.

### 트랙 A — 단일 주문 입력 검증 (Phase A~D)

Commits `b9c52da` → `4394fef` → `d103bb7`. 다음 시나리오:

1. Chrome DevTools MCP → prod 접속 → Vercel SSO + Supabase 로그인 (사용자 직접) → `/orders/new`
2. 마켓(쿠팡) + 마켓주문번호 + 구매자 PII 5필드 + 통관코드 + 해외 매입(아마존US·매입가·판매가) + 배대지 dropdown → 등록
3. `/orders` 목록에서 새 컬럼 (마켓 chip · 마켓번호 · 구매자명 · 판매가) 확인
4. `/orders/[id]` 상세 — "마켓 주문 + 배송 수신자" + "해외 매입" + 배대지 이름 확인
5. 상태 변경 dropdown — pending → confirmed → paid 흐름 (PATCH 버그 fix 검증)

### 트랙 B — 일괄 입력 검증 (세션 6, commit `bb7deef`)

1. `/orders/bulk` 진입 — 27 컬럼 그리드 + 그룹 헤더 렌더 확인
2. CSV 템플릿 다운로드 → 헤더·샘플 행 확인 (BOM·한글 안전)
3. **엑셀 paste 테스트** — 마켓 어드민에서 받은 실제 주문 엑셀로 (또는 샘플 TSV) paste → 자동 매핑 확인
4. 실시간 검증 — 필수값(★) 빈 셀 빨강 표시 / 통계 chip 카운트
5. forwarder dropdown 에 prod 의 10개 배대지 옵션 정상 노출 확인
6. 5건 등록 시도 → 트랙 A 의 목록·상세에서 source='excel_upload' 로 표시되는지
7. 부분 실패 케이스 — 일부 행에 잘못된 enum 값(예: marketplace='naver') 넣어 부분 성공 결과 배너 확인

### 검증 후 발견될 가능성 높은 이슈 후보 (둘 다 공통)

- 4섹션 폼 / 27컬럼 그리드 UX (가로 스크롤 길이, 모바일 대응)
- 통관코드·우편번호 client-side validation (P 시작 13자리, 우편 5자리)
- 상태 변경 옵션 라벨 어색함 ("(으)로 변경") — 더 자연스럽게
- 마진 KRW 자동 계산 미구현 (환율 적용 — `/api/exchange-rate` 호출 시점)
- 페이지 title 중복 "X | 짐스캐너 B2B | 짐스캐너 B2B" — layout title.template
- 일괄 입력 paste 시 라벨(`쿠팡`) → enum(`coupang`) reverse lookup 미구현
- 일괄 입력 행별 순차 insert latency — 100+건 시 체감

---

## 🥈 2순위 — P1: 33 배대지 양식 변환

가장 큰 가치 — 셀러 가입 이유 그 자체. v0 가 자리 잡으면 즉시 진행.

**준비물 (사용자 협업 필요):**
- 33 배대지 양식 spec 수집 — 각 배대지 별 신청서 컬럼/포맷/필수값
- 어느 배대지 우선? main repo 10개 시드(짐패스/몰테일/이하넥스/유니옥션 외) 기준 우선 3~5개로 시작 추천

**구현 단위:**
- `supabase/b2b_forwarder_form_specs.sql` — 양식 컬럼 정의 (forwarder_id, column_name, column_label, source_field, transform 등)
- `src/app/api/orders/export/route.ts` — 주문 1건 또는 N건 → XLSX 변환·반환
- `src/components/b2b/ForwarderExportModal.tsx` — 배대지 선택 + XLSX 다운로드 (Web Worker 사용 권장)
- `/orders/[id]` 사이드바의 "배대지 양식으로 변환" 버튼 활성

---

## 🥉 3순위 — v0.5: SKU 마스터 (상품 카탈로그)

**왜:** 반복 주문이 들어오는 SKU 는 셀러가 한 번 등록해 두면 다음 주문부터 매입처·매입가·배대지·옵션이 자동 추천 → 30초 처리.

**범위:**
- `supabase/b2b_products.sql` — `b2b_products` 테이블 (account_id, seller_sku, display_name, category, default_supplier_site, default_forwarder_id, image_url, notes...)
- `b2b_product_market_links` — 마켓별 상품번호 매핑 (1:N: 같은 SKU 가 여러 마켓에 등록될 수 있음)
- `b2b_product_supplier_links` — 해외 매입처 매핑 (1:N: 가격 비교 대비)
- `/products` 페이지 (목록·생성·상세·편집)
- `/orders/new` 의 ③ 해외 매입 섹션에 SKU autocomplete 추가 (선택 시 supplier·가격 자동 채움)
- 기존 주문에 소급 적용 (선택)

**선결정:** 마켓상품번호로 자동 매칭하는 import 흐름은 v1+ (마켓 API).

---

## 🔵 4순위 — v0.5 자잘한 보강

- 다상품 라인 입력 (`/orders/new` 의 ③ 섹션에서 add/remove 버튼) — 일괄 입력에서는 같은 market_order_number 행을 묶는 방식 보강 필요
- 환율 적용 → 마진 KRW 자동 계산 (`/api/exchange-rate` 호출)
- 통관코드 client-side validation
- 일괄 입력 paste 시 한국어 라벨(`쿠팡`) → enum value(`coupang`) reverse lookup
- 일괄 입력 server function 또는 batched insert 로 100+건 latency 최적화
- `b2b_clients` 의미 변경 — 마켓 구매자 단골 추적용 (예: 같은 phone+marketplace 2회 이상 등장 시 자동 묶음)
- `b2b_subscriptions.monthly_order_used` reset 동작 점검 (월 초 cron)
- 페이지 title.template 중복 fix
- 상태 변경 dropdown 옵션 라벨 자연스럽게 ("(으)로 변경" → 액션 라벨)

---

## 🌳 v1+ (먼 미래)

- 마켓 API 자동 import (쿠팡·스마트스토어 OpenAPI)
- 매입처 가격 비교 — 1 SKU → N supplier 중 최저가 자동 선택
- 재고 관리 — 한국에 도착한 재고 vs 매번 매입
- 운송장 자동 트래킹 (T1/T2)
- 마켓 송장 자동 입력 (역방향, 쿠팡·스마트스토어 OpenAPI)
- 카카오 알림톡 (마켓 구매자에게)
- 마진 시뮬레이터 / 부가세 자료 export

---

## 🛠️ 디자인·코드 메모 (다음 세션용)

- v2.1 디자인 패턴 유지: shadow-sm 카드, accent border-l-[3px], gradient banner, p-8 max-w-{4,5,6}xl
- 쿼터 트리거 `tg_b2b_order_quota_increment` 가 DB 에 있음 (b2b_schema.sql L907) — API 명시 증가 X
- `b2b_clients` 테이블 보존 (의미 변경, v0 미사용). buyer_* PII 는 b2b_orders 에 직접
- forwarders 테이블 + 시드는 main repo schema 에 있음 (10개) — 신규 시드 마이그 불필요
- DB 마이그·DDL 은 **Supabase MCP `apply_migration` 으로 직접 적용** (`feedback_db_migrations_apply_directly.md` 메모리 참조). 사용자에게 떠넘기지 않음
- `triggerWithdrawalNotice` 함수는 git history `b9c52da` 의 이전 버전에서 회복 가능 — v0.5+ 옵션 토글 재활성용

## 🗂️ 적용된 DB 컬럼 (현재 prod 상태)

`b2b_orders` 추가 컬럼 (세션 5+6 누적):
- 마켓: marketplace, market_order_number, market_commission_krw, shipping_fee_krw
- 구매자: buyer_name, buyer_phone, buyer_postal_code, buyer_address, buyer_detail_address, buyer_customs_code
- 배대지: forwarder_warehouse (세션 6 추가)

`b2b_order_items` 추가 컬럼:
- product_id (uuid, SKU 마스터 FK — v0.5 활성)
- supplier_site, supplier_order_number, supplier_purchased_at
- sale_price_krw, market_product_id, market_option

마이그 SQL 파일 위치: `supabase/b2b_orders_market_fields.sql`, `supabase/b2b_orders_forwarder_warehouse.sql`

## 📍 코드 진입점 맵 (다음 세션 빠른 탐색)

```
src/app/(app)/orders/
├── page.tsx              ← 목록 (server) — 마켓 필터, 검색, 빈상태
├── new/
│   ├── page.tsx          ← server wrapper, forwarders 조회
│   └── NewOrderForm.tsx  ← 단일 입력 폼 (4 섹션)
├── [id]/page.tsx         ← 상세 — 마켓+구매자 / 매입 / 배대지 / 메타
└── bulk/
    ├── page.tsx          ← server wrapper
    └── BulkOrderClient.tsx  ← 27 컬럼 그리드 + paste + 템플릿

src/app/api/orders/
├── route.ts              ← POST(단일) + GET(목록)
├── bulk/route.ts         ← POST(일괄, 최대 500행)
├── [id]/status/route.ts  ← PATCH(상태 전이)
└── quota-check/route.ts  ← GET(쿼터 정보)

src/components/b2b/
└── OrderStatusSelector.tsx  ← 상태 변경 client island
```

---

## 🥈 2순위 — Stage 3: 보조 UI 완성

| 작업 | 내용 |
|---|---|
| billing/page.tsx | 구독 플랜·결제 정보·다음 갱신일 (UI 만 — 결제 연동은 P3) |
| 의뢰자 CRM (`clients/`) | R1 프로필 (목록·생성·상세) + 블랙리스트 |
| 알림 센터 | in-app 알림 스키마 + 사업자 알림 센터 (DB schema 있음) |
| 1:1 문의 시스템 | 사업자 → 운영 (스키마 있음, UI 만) |
| 운송장 자동 트래킹 | T1 운송장 일괄 입력 + T2 자동 트래킹 |
| 세무 자료 export (CSV/홈택스) | A9 부가세 신고 자료 |

---

## 🥉 3순위 — Stage 4: UX/QA

| 작업 | 상세 |
|---|---|
| WCAG AA 잔여 검토 | b2b_auto_todo.md 에서 cron 이 발견한 30+ 건 (signup·login·security·pricing 모달 등) |
| Form validation 보강 | inline 에러·실시간 검증 일관성 |
| e2e 시나리오 | 가입 → 주문 입력 → 양식 변환 → 다운로드 |
| 빈 상태·로딩·에러 UI 완성도 | 모든 페이지 |

---

## 🔵 4순위 — Stage 5: 분리 배포·도메인 정착

| 작업 | 담당 |
|---|---|
| `seller.jimscanner.co.kr` Vercel 도메인 매핑 | 🧑 사용자 |
| 매핑 완료 후 main repo `bfa487f` push | 🧑 사용자 |
| `RESEND_API_KEY` 발급·등록 | 🧑 사용자 |
| `NTS_BUSINESS_API_KEY` 발급·등록 (data.go.kr) | 🧑 사용자 |
| Supabase Auth redirect URL 에 새 도메인 추가 | 🧑 사용자 |

스크립트로 자동 등록 가능: `scripts/register-seller-env.mjs` (main repo 에 있음 — 같은 패턴으로 수정)

---

## 🌳 미래 (v1+)

- v2: 의뢰자 셀프 주문 접수 페이지, PG 결제 연동, 카카오 알림톡, 마진 시뮬레이터
- v3: 마켓플레이스 자동화, API/웹훅, ERP 연동
- v4: 쿠팡·스마트스토어 통합 (트리오링크형)

전체 카탈로그: 메인 repo memory `_memory/b2b_service_full_spec_2026_05_14.md` (14 카테고리 80+ 기능)

---

## 사용자 셀프 액션 (시간 날 때)

- [ ] Resend API 키 발급 → Vercel env 추가 (이메일 활성)
- [ ] NTS 사업자등록 진위확인 API 키 → Vercel env (signup step-5 활성)
- [ ] `seller.jimscanner.co.kr` Vercel 도메인 매핑
- [ ] main repo `git push origin main` (도메인 이전 완료 후)
- [ ] Vercel Personal Access Token revoke (24h 자동만료지만 권장)
- [ ] 33 배대지 양식 spec 수동 수집 시작 (Stage 2b 진입 전 또는 병행)
