# 다음 작업 우선순위 큐

마지막 갱신: 2026-05-15 (Stage 2b MVP P0 완료 시점)

---

## 🥇 1순위 — Stage 2b 계속: 주문 상세·양식 변환·실데이터 검증

**왜:** P0 골격(목록·생성·NAV·API) 은 끝났지만, 정작 "왜 가입했는지" = 33 배대지 양식 변환이 아직 비어있음. 그리고 라이브 DB 로 실제 주문 등록·표시가 동작하는지 검증해야 함.

**완료된 것 (2026-05-15):**
- ✅ `src/app/(app)/orders/page.tsx` — 목록 (필터·검색·빈상태)
- ✅ `src/app/(app)/orders/new/page.tsx` — 수동 입력 폼 (1상품 MVP)
- ✅ `src/app/api/orders/route.ts` — POST(쿼터·의뢰자 upsert·라인) + GET
- ✅ SellerShell NAV `/orders` 활성
- ✅ Dashboard "새 주문 입력" QuickAction 활성

**다음 작업 단위:**

| 파일 | 내용 | 우선순위 |
|---|---|---|
| `src/app/(app)/orders/[id]/page.tsx` | 주문 상세 + 상태 변경 + 라인 아이템 표시 | 🔴 P0 |
| 라이브 DB 등록·표시 dogfood | seller.jimscanner.co.kr or 로컬에서 실 주문 1건 등록·목록 확인 | 🔴 P0 |
| `src/components/b2b/ForwarderExportModal.tsx` | 배대지 선택 + XLSX 다운로드 (Web Worker) | 🟡 P1 |
| `src/app/api/orders/export/route.ts` | 양식별 XLSX 변환·반환 | 🟡 P1 |
| `supabase/b2b_forwarder_form_specs.sql` | 33 배대지 양식 컬럼 정의 (사전 데이터 수집 필요) | 🟠 P2 |
| 다상품 입력 지원 | new 페이지에서 라인 아이템 add/remove | 🟠 P2 |

**디자인:** v2.1 패턴 — dashboard 와 같은 톤 (shadow-sm 카드, gradient banner, accent border, p-8 max-w-{4,5,6}xl).

**구현 메모 (다음 세션 컨텍스트):**
- 쿼터 트리거 `tg_b2b_order_quota_increment` 는 b2b_schema.sql L907 에 이미 있음 — POST 가 명시적 increment 안 함, DB 가 알아서 처리
- 의뢰자는 display_name 기준 자동 upsert. 동일 이름이면 첫 매칭 재사용 (의뢰자 관리 UI 완성 후 정교화)
- status 전이 검증은 `/api/orders/[id]/status` (이미 존재) 가 담당, 단 status enum 이 b2b_schema 와 다름 — 정렬 필요
- 상태 enum 정렬: pending/confirmed/paid/forwarder_submitted/in_transit/arrived_korea/delivered/completed/cancelled/refunded

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
