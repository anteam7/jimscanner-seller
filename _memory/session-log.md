# 세션 로그

새 세션 끝나면 한 줄 요약 추가하세요.

---

## 2026-05-15 (분리 + 디자인 v2.1)

세션 1 — 메인 repo 에서 분리·셋업 (해당 작업 컨텍스트는 main repo `_memory/` 또는 사용자 메모리에 있음):

- 자율빌드 cron 113 commits squash merge 해서 main 에 통합 (`a5c75ad`)
- 새 repo `jimscanner-seller` 분리 + URL 평탄화 (`/seller/*` → `/`)
- main repo 의 (b2b) 코드 제거 (cleanup commit `bfa487f`, push 보류)
- GitHub `anteam7/jimscanner-seller` push (`51cffa3`)
- Vercel 새 project 생성 + 5개 env 등록 + framework=nextjs + redeploy → READY
- 로그인 페이지 정상 동작 확인

세션 2 — 디자인 v2 (라이트 톤 한국 sellers SaaS) 적용:

- globals.css 토큰 재정의 + Pretendard 적용
- SellerShell 라이트 메인 + 다크 사이드바 분리
- 27 파일 sed 일괄 색 토큰 swap
- AnnouncementBanner 4 variant 수동 정합

세션 3 — v2.1 강화 (입체감·정체성·여백·보조 색):

- dashboard proto: shadow-sm + gradient banner + accent border + 빠른 작업 카드
- 전 페이지 sed: h1 tracking-tight, p-6→p-8, shadow-sm 카드, signup/login subtitle 진하게
- pricing/settings 수동 강화 (카드 그리드, max-w 확장)
- 짐스캐너 B2C 로고 그대로 사용 (브라이트니스 0 + invert 로 다크 사이드바 호환)

다음 세션: Stage 2b 주문 관리 MVP. 자세한 건 `_memory/next-steps.md`.

---

## 2026-05-15 (Stage 2b — 주문 관리 MVP UI 골격)

- `src/app/(app)/orders/page.tsx` — 목록 (server): 상태 필터 7종 핍 그룹, 주문번호 검색, 빈상태 카드, hover row, status badge 10종, 50건 limit
- `src/app/(app)/orders/new/page.tsx` — 수동 입력 폼 (client): order_number 자동 생성, 의뢰자명, 상품 1건(MVP), USD/JPY/CNY/EUR/KRW, 합계 자동 계산
- `src/app/api/orders/route.ts` — POST(create + 의뢰자 자동 upsert + 쿼터·grace period 체크 + 라인 아이템) + GET(목록)
- `SellerShell.tsx` — NAV `/orders` available=true 활성
- `dashboard/page.tsx` — "새 주문 입력" QuickAction 활성
- 쿼터 트리거 `tg_b2b_order_quota_increment` 가 DB 에 이미 있음(b2b_schema.sql L907) — API 에서 명시적 increment 불필요
- `npm run build` 통과, 28 page

남은 작업: orders/[id] 상세, ForwarderExportModal, 33 배대지 spec seed. next-steps 참조.

---

## 2026-05-15 (도메인 재정의 + Phase A~D 시작)

세션 5 — dogfood 직후 도메인 재정의:

dogfood 결과 도메인 전제 자체가 잘못됐음을 확인 (사용자 정정).
- 기존: 구매대행 사업자 ← 의뢰자 직접
- 실제: 국내 마켓 셀러 ← 쿠팡/스마트스토어/옥션/지마켓 등 마켓 ← 마켓 구매자.
  셀러가 해외(미국아마존/일본아마존/라쿠텐 등)에서 매입 → 본인이 정한 배대지 → 마켓 구매자에게 배송

추가 정리:
- SKU 매칭: 선택사항 (선등록/즉석/없음 모두 가능, 소급도 가능)
- v0: 수동 입력만 / v1: 마켓 API 자동 수집 / 가격비교·재고는 추후

Phase A~D 진입:
- A: 도메인 메모 정정, DB 마이그 SQL, PATCH 버그 fix
- B: /api/orders + /orders/* 재구성
- C: 상태 라벨 셀러 관점 정정
- D: forwarders 시드·선택 UX

dogfood 발견 이슈:
- ✅ /orders/new → POST → /orders 정상 (도메인 정정 전 데이터로 검증)
- ✅ /orders/[id] 상세 정상 (도메인 정정 전)
- ❌ PATCH /api/orders/[id]/status — b2b_accounts.select 에 schema 에 없는 `withdrawal_notice_*` 컬럼 요청 → "사업자 계정이 없습니다" 반환. Phase A 에서 fix.
