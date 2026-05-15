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
