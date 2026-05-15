# 다음 작업 우선순위 큐

마지막 갱신: 2026-05-15 (디자인 v2.1 + 로고 적용 완료 시점)

---

## 🥇 1순위 — Stage 2b: 주문 관리 MVP UI 골격

**왜:** 가입·인증·결제 인프라는 거의 완성됐지만 정작 "왜 가입했는지" = 주문 관리가 비어있음. SellerShell NAV 의 `/orders` 도 `available: false` 상태.

**MVP 범위 (사용자 합의):**
- 수동으로 주문을 입력
- 33 배대지 양식 중 선택해 엑셀로 다운로드

**작업 단위:**

| 파일 | 내용 | 우선순위 |
|---|---|---|
| `src/app/(app)/orders/page.tsx` | 주문 목록 (server) — 빈 상태 + 테이블 + 필터/검색 + "엑셀 변환" 액션 | 🔴 P0 |
| `src/app/(app)/orders/new/page.tsx` | 수동 주문 입력 폼 (client) — order_number·client·product 1개·quantity·price·notes | 🔴 P0 |
| `src/app/(app)/orders/[id]/page.tsx` | 주문 상세 + 상태 변경 + 라인 아이템 편집 | 🟡 P1 |
| `src/components/b2b/ForwarderExportModal.tsx` | 33 배대지 선택 모달 + XLSX 다운로드 (Web Worker) | 🟡 P1 |
| `src/app/api/orders/route.ts` (POST/GET) | 주문 생성·목록 API | 🔴 P0 |
| `src/app/api/orders/export/route.ts` | 선택된 주문 → 양식별 XLSX 변환·반환 | 🟡 P1 |
| `supabase/b2b_forwarder_form_specs.sql` | 33 배대지 양식 컬럼 정의 (사전 데이터 수집 필요) | 🟠 P2 |
| `src/components/b2b/SellerShell.tsx` | `/orders` `available: true` 로 변경 | 🔴 P0 |

**디자인:** v2.1 패턴 — dashboard 와 같은 톤 (shadow-sm 카드, gradient banner, accent border, p-8 max-w-{4,5,6}xl).

**진행 권장 순서:**
1. orders/page.tsx + new/page.tsx (UI 골격) — 데이터 연결 X, 빈 상태·로딩·에러 모두 표시
2. SellerShell NAV `/orders` available=true 처리
3. /api/orders POST/GET 구현 + 실 데이터 연결
4. ForwarderExportModal — 일단 mock 양식 1~2개로 시작
5. 33 배대지 spec DB seed (별도 작업, 사용자 검토)

**db schema 참고:**
- `supabase/b2b_schema.sql` 의 `b2b_orders` (라인 238~) + `b2b_order_items` (라인 295~)
- 상태 enum: pending/confirmed/paid/forwarder_submitted/in_transit/arrived_korea/delivered/completed/cancelled/refunded

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
