# 다음 작업 우선순위 큐

마지막 갱신: 2026-05-18 (세션 12 — 브라우저 확장 + 매입처 영수증 + 배대지 주소 인프라 완료)

새 세션 시작 시 [`extension-architecture.md`](extension-architecture.md) 와 이 파일 1순위 먼저 확인.

---

## 🥇 1순위 — 브라우저 확장 e2e 검증 (사용자 액션 필요)

세션 12 에서 인프라까지는 다 만들었음. 실제 동작 검증이 남음.

| 항목 | 검증 방법 | 비고 |
|---|---|---|
| **amazon.co.jp 영수증 수집** | `amazon.co.jp/your-orders` → order details → 📦 가져오기 | 일본어 라벨 정규식이 실제로 통과하는지 |
| **KRW 결제 영수증 통화 감지** | Amazon Currency Converter 적용된 주문 → 가져오기 → `currency='KRW'` 확인 | raw_meta.detected_currency 토글로 확인 |
| **/settings/forwarder-addresses 본인 주소 추가** | 공용 [내 주소로 추가] → 영문이름·회원번호 채워 저장 → 기본 설정 | |
| **amazon.com checkout 자동입력** | 결제 진행 → /checkout/.../address → 🏠 → 내 주소 탭 → 클릭 → form 채워짐 | React-controlled input 채워지는지 (selector 안 맞으면 console 로그) |
| **amazon.co.jp checkout 자동입력** | 동일 흐름 + 일본 주소 | 일본 amazon 의 form 필드명이 US 와 같은지 별도 확인 |

검증 후 발견한 selector mismatch 는 즉시 패치 가능.

---

## 🥈 2순위 — 확장 후속 (다음 세션에 자동 진행 가능)

### A. 라쿠텐 + 야후 스크래퍼 추가
- 패턴: `extension/scrapers/rakuten.js`, `extension/scrapers/yahoo.js`
- manifest host_permissions + content_scripts 매처 추가
- 사이트별 selector 식별 — 실제 페이지 1개 보고 작업
- 30-60분/사이트

### B. /imports → b2b_orders 매칭 UI
- /imports 에 "매칭 추천" 컬럼: heuristic (buyer_phone last 4 / 매입 금액 ± 환율 / supplier_site)
- 클릭 시 / 수동 검색 — 매칭되면 `matched_order_id` + `matched_at` 채움
- 매칭되면 b2b_order_items.supplier_order_number 도 자동 채움

### C. 셀러 본인 row 만들 때 회원번호 자동 합성 — checkout 검증
- 현재: `address2` 가 비어있을 때만 `Member # NNN` 자동 합성
- 배대지마다 회원번호 위치 다름 (recipient_name 끝 / address2 / 별도 라인) — 검증 후 패턴 추가

### D. 확장 아이콘 PNG 16/48/128
- 짐스캐너 로고 기반 PNG 3개 만들어 `extension/icons/`
- manifest 의 icons 섹션 복원

### E. CN 공용 주소 시드 + 타오바오 form 구조 검증
- centers 의 CN 18개 → b2b_forwarder_addresses 시드
- 타오바오/1688 결제 form 필드명 확인 후 별도 content script

---

## 🥉 3순위 — 도메인·운영 (사용자 액션)

| 항목 | 비고 |
|---|---|
| `seller.jimscanner.co.kr` Vercel 도메인 매핑 | DNS CNAME → cname.vercel-dns.com |
| `RESEND_API_KEY` 발급 + Vercel env 등록 | 이메일 발송 |
| `NTS_BUSINESS_API_KEY` 발급 (data.go.kr) | signup step-5 사업자 진위확인 |
| Supabase Auth redirect URL 새 도메인 추가 | 도메인 매핑 후 |
| main repo `bfa487f` push + types/supabase.ts sync | DB 공유라 두 repo 동기화 |
| **main repo 어드민 `/admin/forwarders` 에 `default_phone` 입력 필드 추가** | `forwarders.default_phone` 컬럼 (2026-05-20 추가). 채운 후 `supabase/b2b_forwarder_addresses_seed_from_centers.sql` 재실행하면 공용 시드 phone 자동 반영 (amazon checkout 자동입력 활용) |

---

## 🔵 4순위 — 기술 부채

- admin client `any` 캐스팅 제거 (types/supabase.ts 가 있으니 점진 가능)
- B3 첫 로그인 onboarding modal (대시보드 빈상태 가이드와 별개)
- paste 한글 → enum reverse lookup 확장
- /api/announcements/active graceful 제거

---

## 🌳 v1+ (먼 미래)

- 마켓 API 자동 import (쿠팡·스마트스토어)
- 매입처 가격 비교 (1 SKU → N supplier)
- 재고 관리
- 외부 트래킹 API (17track / CJ대한통운)
- 카카오 알림톡 (D4 — MANUAL 키)
- 영문 상품명 자동 번역 (C2 — MANUAL 키)
- 마진 시뮬레이터 / 부가세 자료 외 확장

---

## 📂 새로 만들어진 자산 맵 (세션 12)

```
extension/                                  ← 새 (브라우저 확장)
├── manifest.json
├── popup.html / popup.js
├── background.js
├── scrapers/amazon-us.js, amazon-jp.js
└── checkout/amazon-checkout.js

src/app/api/
├── seller-tokens/route.ts                  ← 확장 토큰 발급/revoke
├── imports/supplier-orders/route.ts        ← 영수증 수집 (Bearer)
├── imports/supplier-orders/[id]/route.ts   ← 영수증 삭제
├── forwarder-addresses/route.ts            ← 배대지 주소 CRUD
├── forwarder-addresses/[id]/route.ts
└── extension/addresses/route.ts            ← 확장 호출용 (Bearer, country 필터)

src/app/(app)/
├── settings/extension/...                  ← 토큰 발급 페이지
├── settings/forwarder-addresses/...        ← 배대지 주소 관리 (공용/본인 + 국가 배지)
├── imports/page.tsx                        ← 영수증 목록
└── imports/[id]/page.tsx                   ← 영수증 상세

src/lib/b2b/seller-tokens.ts                ← 토큰 해싱·검증 helper

supabase/
├── b2b_supplier_purchases_and_tokens.sql
├── b2b_forwarder_addresses.sql
└── b2b_forwarder_addresses_seed_from_centers.sql
```

---

## 🗂️ 사용자 셀프 액션 (시간 날 때)

- [ ] Resend / NTS API 키 발급 → Vercel env (이메일·사업자 진위확인 활성)
- [ ] `seller.jimscanner.co.kr` 도메인 매핑 + DNS CNAME
- [ ] main repo push 도메인 정리 commit (`bfa487f`)
- [ ] 확장 새로고침 후 amazon 결제 e2e 검증 → 결과 보고
