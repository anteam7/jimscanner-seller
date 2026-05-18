# 브라우저 확장 아키텍처 (세션 12, 2026-05-18)

## 큰 그림

```
[셀러 브라우저]                        [짐스캐너 (이 repo)]               [매입처]
amazon.com/your-orders ─┐
amazon.co.jp ─┐         │
                        ├ extension/scrapers/* ─POST→  /api/imports/supplier-orders
                        │                              → b2b_supplier_purchases
                        │
                        │
amazon.com/checkout/.../address ─┐
amazon.co.jp/checkout/...        ├ extension/checkout/ ─GET→ /api/extension/addresses?country=US|JP
                                 │                              ← b2b_forwarder_addresses
                                 ├ React-controlled input 자동 채움
                                 ↓
                            (form 채워짐)
```

---

## 폴더 구조

```
extension/
├── manifest.json              MV3, host_permissions amazon.com / amazon.co.jp / *.vercel.app / *.jimscanner.co.kr
├── popup.html / popup.js      API URL + 토큰 저장, 연결 확인 (background 경유)
├── background.js              service worker — content script ↔ 짐스캐너 API 중계
│                              메시지 타입:
│                              - JIMSCANNER_IMPORT        (영수증 수집)
│                              - JIMSCANNER_PING          (토큰 검증)
│                              - JIMSCANNER_FETCH_ADDRESSES (배대지 주소 fetch)
├── scrapers/
│   ├── amazon-us.js           amazon.com order-details 영수증 수집
│   └── amazon-jp.js           amazon.co.jp 동일 + 일본어 라벨
└── checkout/
    └── amazon-checkout.js     amazon US/JP 의 checkout/.../address 자동 채움 + 탭(내/공용)
```

---

## DB 테이블 (이 세션 생성)

### `b2b_supplier_purchases`
매입처 영수증. 확장이 INSERT, /imports 가 SELECT.

```
account_id, source ('amazon_us'|'amazon_jp'|'rakuten'|'yahoo'),
supplier_order_number, purchased_at, currency,
subtotal_foreign, shipping_foreign, tax_foreign, total_foreign,
items jsonb [{ name, qty, unit_price, asin, image_url, product_url }],
source_url, raw_meta,
matched_order_id FK b2b_orders (nullable — 한국 마켓 주문과 매칭 후 채움),
matched_at
```

- UNIQUE (account_id, source, supplier_order_number) — 멱등 보장
- RLS: select/update/delete 본인 row, **INSERT 는 service_role 만** (확장 → API → admin client)

### `b2b_seller_tokens`
확장 인증용 long-lived 토큰. raw 는 sha256 hash 만 저장.

```
account_id, label, token_hash (sha256 hex), token_prefix (raw 의 앞 12자),
last_used_at, created_at, revoked_at
```

- token format: `jsx_<43chars base64url>` (총 47자)
- 발급: `/settings/extension` 에서 1회만 raw 표시
- 검증: `authenticateSellerToken(request)` in `src/lib/b2b/seller-tokens.ts`

### `b2b_forwarder_addresses`
배대지 영문 주소 — checkout 자동 입력용.

```
account_id (nullable; null = 공용 시드),
forwarder_id FK forwarders,
label, recipient_name, phone, address1, address2, city, state, zip, country,
member_no, is_official (true ⇔ account_id null), is_default, notes
```

- CHECK: `is_official = true → account_id IS NULL` 보장
- RLS: select 누구나 공용 + 본인 / insert·update·delete 본인 row + is_official=false 만

### 시드 (이 세션)
- `b2b_supplier_purchases_and_tokens.sql` — 영수증 + 토큰 테이블
- `b2b_forwarder_addresses.sql` — 주소 테이블
- `b2b_forwarder_addresses_seed_from_centers.sql` — 메인 repo 의 `centers` 테이블 (81개) → 공용 시드. US 40 + JP 17 = 57개. 멱등 (DELETE is_official=true 후 재삽입)

> ⚠️ **centers** 테이블은 main repo (jimpass-agent-platform) 의 `/forwarders/[slug]` 페이지가 사용. 컬럼: forwarder_id, country, center_name, address (단일 텍스트), state, is_tax_free, lat/lng. US 는 `'street, city, state zip'` 표준 형식이라 정규식 파싱 가능.

---

## API 엔드포인트 (이 세션 추가)

| Path | Method | 인증 | 비고 |
|---|---|---|---|
| `/api/seller-tokens` | POST/DELETE | 셀러 세션 | 토큰 발급 (raw 1회 노출) / revoke |
| `/api/imports/supplier-orders` | POST | Bearer (`jsx_...`) | 확장이 호출, 멱등 (existing 반환), CORS |
| `/api/imports/supplier-orders/[id]` | DELETE | 셀러 세션 | 본인 영수증 삭제 |
| `/api/forwarder-addresses` | GET/POST | 셀러 세션 | 본인 + 공용 주소 / 본인 등록 |
| `/api/forwarder-addresses/[id]` | PATCH/DELETE | 셀러 세션 | is_default 토글 / 전체 수정 / 삭제 |
| `/api/extension/addresses` | GET | Bearer | 확장이 호출, `?country=US\|JP` 필터, CORS |

---

## 페이지

| Path | 비고 |
|---|---|
| `/settings/extension` | 토큰 발급·관리 + 설치 가이드 |
| `/settings/forwarder-addresses` | 공용 시드 + 본인 주소 CRUD, 국가 배지, "내 주소로 추가" 액션 |
| `/imports` | 수집 영수증 목록 + 매칭 통계 |
| `/imports/[id]` | 영수증 상세 (상품 라인 전부 + KRW 환산 + raw_meta 디버깅 토글 + 삭제) |

---

## 핵심 알고리즘 / 패턴

### amazon order-details ASIN 추출 (정밀화 끝남)
- `a[href*="/dp/"]` / `/gp/product/` / `/gp/aw/d/` anchor 중 `[A-Z0-9]{10}` 매치
- **shipment 컨테이너** (`#orderDetails / [data-component=shipments|purchasedItems|shipment] / .shipment / #od-shipments`) 안의 ASIN 만
- **추천 영역** (`.a-carousel / [data-component=recommendations|related|buyAgain] / [id*=sims|p13n] / [aria-label*=ecommend|elated|uy it again]`) 제외
- ASIN 기준 dedup (썸네일 + 제목 anchor 중복 제거)
- 인식 실패 시 디버그 보고서 + 클립보드 복사 버튼

### 통화 감지
```
₩ 또는 KRW → KRW
¥ 또는 ￥ 또는 円 또는 JPY → JPY
$ 또는 USD → USD
(못 찾으면 페이지 body 텍스트에서 1회 시도, fallback US/JP 기본값)
```
`raw_meta.detected_currency` + `total_row_text` 로 디버깅.

### React-controlled input 채우기 (checkout)
```js
const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype
Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
el.dispatchEvent(new Event('input', { bubbles: true }))
el.dispatchEvent(new Event('change', { bubbles: true }))
```
amazon checkout 의 input 셀렉터는 `[autocomplete="..."]` 우선 + `[name="enterAddress..."]` fallback.

### 국가 필터
content script 에서 `location.hostname` → country (`amazon.com` → US, `amazon.co.jp` → JP) → `/api/extension/addresses?country=US` 호출 → popup 에 그 국가 주소만 표시.

---

## 환경 / 운영

- Vercel deployment protection **OFF** 상태 (사용자가 끔)
- prod URL: `https://jimscanner-seller.vercel.app`
- 도메인 매핑 `seller.jimscanner.co.kr` **미적용** (DNS 안 됨)
- 확장 로컬 설치: `chrome://extensions` → 개발자 모드 → 압축해제 → `C:\Web\jimscanner-seller\extension`

---

## 알려진 한계

1. **amazon JP/checkout 실제 검증 미완** — US 영수증 수집은 통과. JP/체크아웃은 다음 세션에 검증.
2. **회원번호 자동 합성** — `address2` 가 비어있을 때만 `Member # ...` 형식으로 자동 합성. 배대지마다 회원번호 위치 다름.
3. **라쿠텐/야후/타오바오 스크래퍼 없음**.
4. **CN 18개 공용 주소 시드 안 됨** — 중국어 주소 파싱 + 타오바오 결제 form 구조 별도 검증 필요.
5. **/imports 와 b2b_orders 매칭 UI 없음** — 영수증 수집만 됨, 한국 마켓 주문과 연결은 수동도 자동도 없음.
6. **확장 아이콘 PNG 없음** — Chrome 기본 puzzle icon 사용 중.
