# 다음 작업 우선순위 큐

마지막 갱신: 2026-05-15 (도메인 재정의 + Phase A~D 진입 시점)

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

## 🥇 1순위 — Phase A~D 진행 중 (2026-05-15 시작)

**완료된 v0 골격 (도메인 재정의 전):**
- ✅ `src/app/(app)/orders/page.tsx` — 목록 (의뢰자 컬럼 — 재구성 필요)
- ✅ `src/app/(app)/orders/new/page.tsx` — 수동 입력 폼 (재구성 필요)
- ✅ `src/app/(app)/orders/[id]/page.tsx` — 주문 상세 (재구성 필요)
- ✅ `src/app/api/orders/route.ts` — POST/GET (재구성 필요)
- ✅ SellerShell NAV / Dashboard QuickAction 활성
- ⚠️ PATCH `/api/orders/[id]/status` — `withdrawal_notice_*` select 컬럼 누락 버그 (Phase A 에서 fix)

**Phase A — 기반 정리:**
1. 도메인 메모 정정 (CLAUDE.md, _memory/*) — 이 항목
2. DB 마이그레이션 SQL: b2b_orders + b2b_order_items 컬럼 추가 (사용자 적용)
3. PATCH status route 의 b2b_accounts.select 버그 fix

**Phase B — UI/API 재구성:**
4. `/api/orders` POST 마켓/구매자/forwarder 수용, 의뢰자 자동 upsert 제거
5. `/orders/new` 4 섹션 (마켓 / 구매자 / 해외 매입 라인 / 배대지)
6. `/orders` 목록 컬럼 교체 (마켓·마켓번호·구매자·판매가)
7. `/orders/[id]` 상세 재구성 (마켓+구매자 / 매입+판매+마진 / 배대지)

**Phase C — 상태 라벨 정정:** enum 그대로, 라벨만 셀러 관점.

**Phase D — forwarders 시드·선택 UX**

**P1+ (다음 phase):**
- 33 배대지 양식 spec + XLSX 변환
- SKU 마스터 (b2b_products + 마켓/매입처 매핑)
- 다상품 입력 (라인 add/remove)
- 마켓 API 자동 import
- 매입처 가격 비교
- 재고 관리

**디자인:** v2.1 패턴 — dashboard 와 같은 톤 (shadow-sm 카드, gradient banner, accent border, p-8 max-w-{4,5,6}xl).

**구현 메모 (다음 세션 컨텍스트):**
- 쿼터 트리거 `tg_b2b_order_quota_increment` 는 b2b_schema.sql L907 에 이미 있음 — POST 가 명시적 increment 안 함, DB 가 알아서 처리
- `b2b_clients` 테이블은 의미 변경(마켓 구매자 단골 추적용)으로 보존, v0 에서 적극 사용 X — buyer_* 는 b2b_orders 에 직접 저장
- forwarders 테이블은 main repo 또는 이전 마이그레이션에 정의 (이 repo schema 엔 외부 참조만)

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
