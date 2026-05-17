# 짐스캐너 SELLER — 전체 기능 로드맵

작성: 2026-05-17 (세션 10 후반)
컨셉: **해외 직구 셀러의 운영 자동화 SaaS**

---

## 분류 기준
- **AUTO**: 사용자 의견 / API 키 / 외부 결정 없이 즉시 자동 진행 가능
- **MANUAL**: 사용자 API 키 발급 / 사용자 결정 / 외부 API 등록 필요

---

## A. signup 카피 정합성 (Critical)

| ID | 항목 | 분류 | 예상 |
|---|---|---|---|
| A1 | 카운트 동기화: signup "33/13/24/7" → 실제 (forwarders 30 활성, marketplaces 14, suppliers 25, currencies 8) 동기화 | AUTO | 10분 |
| A2 | NTS 사업자 자동 인증 — 코드는 있지만 NTS_BUSINESS_API_KEY 미등록. signup "사업자등록 진위확인 (자동)" 약속 위반 | MANUAL | 사용자 키 발급 |
| A3 | Resend 이메일 — RESEND_API_KEY 미등록. "이메일 인증" 가입 절차 미동작 | MANUAL | 사용자 키 발급 |

---

## B. 운영 자동화 약속 보강 (High)

| ID | 항목 | 분류 | 예상 |
|---|---|---|---|
| B1 | 합배송 모달에 배송비 절감 추정 표시 — "N건 합치면 배송비 1회 = ~M원 절감" | AUTO | 30분 |
| B2 | 마진율 경고 — 마진율 < 5% 시 /orders/new 와 /orders/[id] 에 inline 경고 | AUTO | 30분 |
| B3 | 첫 로그인 onboarding 가이드 — 빈 상태 (주문 0건) 셀러에게 3-step 안내 | AUTO | 30분 |
| B4 | dashboard 빈 상태 — 주문/SKU 0건 시 "시작하기 3단계" 카드 | AUTO | 30분 |

---

## C. next-steps 잔여 (Medium)

| ID | 항목 | 분류 | 예상 |
|---|---|---|---|
| C1 | `/orders/bulk` SKU autocomplete (Phase 3) — grid 셀 안 dropdown | AUTO | 60분 |
| C2 | 영문상품명 자동 번역 (Papago / Google API) | MANUAL | 사용자 키 |
| C3 | `b2b_order_items` 컬럼 추가: `image_url`, `tracking_number_overseas` + 입력 UI | AUTO | 30분 |
| C4 | dashboard 통계 더 풍성 (최근 주문 row + 트렌드 미니 차트) | AUTO | 30분 |
| C5 | `/pricing` 페이지 디자인 v2.1 톤 일치 | AUTO | 30분 |
| C6 | `/settings` 페이지 디자인 v2.1 톤 일치 | AUTO | 30분 |
| C7 | `/login` 페이지 디자인 톤 (signup 과 통일) | AUTO | 30분 |
| C8 | 404 (`not-found.tsx`) 디자인 페이지 | AUTO | 15분 |
| C9 | `auth/forgot-password`, `auth/reset-password`, `auth/mfa-challenge` 디자인 v2.1 | AUTO | 30분 |

---

## D. 어필리에이트 + v1+ 신기능 (Low → 일부 v0.5 진입 가능)

| ID | 항목 | 분류 | 예상 |
|---|---|---|---|
| D1 | 어필리에이트 상품 추천 페이지 (`/recommendations`) — mock 데이터로 시작 가능 (실 어필리에이트 ID 는 추후) | AUTO (mock) | 60분 |
| D2 | 마켓 OpenAPI 자동 import (쿠팡 / 스마트스토어) — 각 마켓 인증 토큰 필요 | MANUAL | 사용자 |
| D3 | 운송장 자동 트래킹 — 스키마 + 수동 입력 UI 까지는 자동 가능 | AUTO (부분) | 60분 |
| D4 | 카카오 알림톡 — 비즈니스 채널 + Sender 등록 필요 | MANUAL | 사용자 |
| D5 | 부가세 자료 export (CSV / 홈택스 양식) | AUTO | 30분 |

---

## E. v0.5 미완성 보강

| ID | 항목 | 분류 | 예상 |
|---|---|---|---|
| E1 | `b2b_announcements` 테이블 구축 + admin 배너 입력 | AUTO | 30분 |
| E2 | 알림 센터 (in-app) — DB 있음, UI 만 | AUTO | 60분 |
| E3 | 1:1 문의 시스템 UI — 스키마 있음 | AUTO | 60분 |
| E4 | 의뢰자 CRM (`/clients`) — 미구현. 마켓 구매자 단골 추적 (같은 phone+marketplace 2회+) | AUTO | 60분 |
| E5 | `/billing` 페이지 UI — 구독 플랜·결제 정보·다음 갱신일 (UI만, 결제 연동 X) | AUTO | 30분 |

---

## F. UX / 디자인 일관성

| ID | 항목 | 분류 | 예상 |
|---|---|---|---|
| F1 | dashboard `unstable_cache` (account_id 키, 60s) — 4쿼리 캐싱 | AUTO | 30분 |
| F2 | Pretendard CDN preconnect + font preload (FOIT 감소) | AUTO | 15분 |
| F3 | 전 페이지 form validation 일관성 (inline 에러 + aria-invalid) | AUTO | 60분 |
| F4 | WCAG AA 잔여 검토 (signup/login/security 등) | AUTO | 60분 |
| F5 | 모바일 반응형 검토 (사이드바·모달) | AUTO | 60분 |

---

## G. 기술 부채

| ID | 항목 | 분류 | 예상 |
|---|---|---|---|
| G1 | Supabase generated types 도입 (`npm run gen:types`) — admin client `any` 캐스팅 제거 | AUTO | 30분 |
| G2 | b2b_subscriptions monthly_order_used reset (월 초 cron) | AUTO | 30분 |
| G3 | /api/announcements/active 의 graceful 빈 배열 → 실제 테이블 활성화 후 정상화 (E1 후속) | AUTO | 15분 |

---

## H. 비즈니스 가치 (어필리에이트 / 데이터)

| ID | 항목 | 분류 | 예상 |
|---|---|---|---|
| H1 | "잘 나가는 SKU" 추천 — 본인 + 전체 셀러 데이터 (익명) 기반 | AUTO | 60분 |
| H2 | 환율 변동 알림 (USD 5% 이상 변동 시 dashboard 배너) | AUTO | 30분 |
| H3 | 마진 손실 알림 — 환율 변동으로 등록된 SKU 의 예상 마진이 음수가 된 경우 | AUTO | 30분 |

---

## 요약 통계

- 전체 항목: 37개
- AUTO (즉시 자동 가능): **30개**
- MANUAL (사용자 API 키 / 결정 필요): **7개** (A2, A3, C2, D2, D4, 일부 D3)
- AUTO 만 합산 예상 시간: 약 **18시간** (각 30~60분 × 30개)

---

## 자동 큐 진행 방식

[`auto-queue.md`](auto-queue.md) 가 cron 의 작업 큐.
- 30분에 한 번 cron fire
- prompt: "auto-queue.md 의 첫 pending 항목 1개 처리 + commit + push + 큐 갱신"
- 큐 비면 cron 자동 종료
