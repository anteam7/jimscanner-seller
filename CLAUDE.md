# CLAUDE.md — 짐스캐너 SELLER (B2B) 작업 지시서

새 세션 시작 시 이 파일을 먼저 읽으세요. 진입점·우선순위·컨텍스트가 정리되어 있습니다.

---

## 0. 빠른 진입 (필독 순서)

1. **이 파일** (CLAUDE.md) — 현재 위치
2. [`_memory/next-steps.md`](_memory/next-steps.md) — **다음 할 일 우선순위 큐**
3. [`_memory/design-system.md`](_memory/design-system.md) — 디자인 토큰·패턴 (코드 짤 때 참고)
4. [`_memory/session-log.md`](_memory/session-log.md) — 진행 이력 (과거 결정 컨텍스트)

새 작업 시작 전 (2)의 1순위 항목 확인.

---

## 1. 이 프로젝트가 뭐냐

짐스캐너 B2B SaaS — **국내 마켓 셀러의 해외 매입·배대지 운영 도구**.

**워크플로우 (셀러 일상):**
```
[1] 국내 마켓 주문 접수            [2] 해외 매입           [3] 배대지 → 마켓 구매자
쿠팡·스마트스토어·옥션·지마켓· ─▶ 미국아마존·일본아마존· ─▶ 33개 배대지 중 1개 선택
자사몰 등에서 주문이 들어옴         라쿠텐·타오바오 등         → 양식 자동 변환
                                  에서 셀러가 매입           → 수신자 = 마켓 구매자
```

**핵심 가치 (v0 MVP):** 마켓 주문 1건 → 33 배대지 양식 자동 변환 (마켓 구매자 주소 + 매입 상품 정보를 양식에 자동 채움). 5분 → 30초.

**핵심 엔티티:**
- 주문(b2b_orders): 1 마켓 주문. `marketplace`, `market_order_number`, `buyer_*`(PII), `forwarder_id`
- 라인(b2b_order_items): 마켓 주문의 상품·해외 매입처. `supplier_site`, `supplier_order_number`, `unit_price_foreign`(매입가), `sale_price_krw`(판매가), 옵션 `product_id`(SKU)
- SKU 마스터(b2b_products, v0.5): 셀러 자체 SKU. 마켓상품 ↔ 해외매입처 매핑. **v0 에선 선택 — 없어도 주문 등록 가능**.

**범위:**
- v0: 수동 입력만. 양식 변환 P1. SKU 매칭은 선택.
- v0.5+: SKU 마스터·매핑·소급 적용
- v1: 마켓 API 자동 수집, 매입처 가격비교, 재고 관리, 마진 시뮬레이터

- 도메인: `seller.jimscanner.co.kr` (별도 Vercel project)
- 1차 타깃: 월 100~500건 처리하는 국내 마켓 셀러 (구매대행 1세대 → 구매대행 2세대 = 마켓 셀러 전환)
- 차별점: 33 배대지 양식 통합 자동 변환 (수신자 = 마켓 구매자 자동 매핑)
- 메인 짐스캐너 (B2C, `jimscanner.co.kr`) 와 **DB 공유, 코드 분리**

---

## 2. Repo 구조

```
C:/Web/jimscanner-seller/    ← 이 repo (이 세션 작업 위치)
  src/app/
    (app)/                    인증 필요 영역 — SellerShell wrap
      dashboard, settings, pricing, billing/cancel
    auth/                     OAuth callback, password reset, MFA
    login, signup/, suspended
    api/                      REST API (orders, billing, signup, etc.)
  src/components/b2b/         B2B 전용 컴포넌트
  src/components/ui/          shadcn — main repo 와 수동 sync 필요
  src/lib/{auth, security, b2b, utils}/  공유 자산 — main repo 와 수동 sync
  supabase/                   DB 스키마 (b2b_* 접두사)
  types/supabase.ts           main repo 의 npm run gen:types 결과 (수동 copy)
  _memory/                    세션 컨텍스트
  docs/                       (필요시 추가)

C:/Web/jimscanner/jimpass-agent-platform/  ← 메인 B2C repo (별도)
  - DB 같음 (Supabase obxvucyhzlakensopalf)
  - 어드민 (B2B 회원 관리 포함) 은 거기에 유지
  - 짐스캐너 로고·디자인 일부 자산 sync 대상
```

**원칙:**
- B2B 코드는 이 repo 안에서만. main repo 의 `(b2b)` 디렉토리는 이미 제거됨.
- 공유 자산 (security helpers, auth client, shadcn ui, utils) 변경 시 **양쪽 repo 수동 sync**.
- 어드민 페이지는 메인 repo (`/admin/b2b-accounts`, `/admin/b2b-auto-runs`, `/admin/churn`, `/admin/support`) 에서 운영.

---

## 3. 기술 스택

- Next.js 16.1.6 (App Router) + React 19 + Turbopack
- TypeScript 5 strict + ESLint
- Tailwind v4 + shadcn/ui + tw-animate-css
- Pretendard Variable (CDN, 한국어) + Geist (영문/숫자)
- Supabase (Auth + Postgres) — `obxvucyhzlakensopalf.supabase.co`
- Resend (트랜잭션 이메일)
- 한국수출입은행 환율 API
- 국세청 사업자등록 진위확인 API (NTS)

---

## 4. 디자인 컨셉 (v2.1)

**톤:** 한국 sellers SaaS — 라이트 메인 + 다크 사이드바
- 레퍼런스: 샵링커·셀러허브·플레이오토·카페24 어드민
- bg-slate-50 (canvas) + white (surface) + slate-800 (sidebar)
- indigo-600 primary + emerald-600/amber-600/sky-500 보조
- Pretendard + 한국어 14px 본문
- 카드 shadow-sm + hover shadow-md + accent border-l-[3px]
- 상태 배너 gradient (from-{color}-50 to-white)
- B2C 짐스캐너 로고 + "SELLER" 표기 (sidebar 다크 위에 invert filter)

상세는 [`_memory/design-system.md`](_memory/design-system.md).

---

## 5. 작업 순서 (필독)

```
새 작업 시작 전:
  [ ] _memory/next-steps.md 의 1순위 항목 확인
  [ ] 관련 _memory/*.md 메모 확인

작업 중:
  [ ] 디자인 패턴은 _memory/design-system.md 따름
  [ ] 공유 자산 (lib/auth, security, ui, utils) 변경 시 main repo 도 같이 수정 메모

작업 후:
  [ ] npm run build 통과 (필수)
  [ ] _memory/session-log.md 에 한 줄 요약 추가
  [ ] 다음 작업 큐 갱신 (_memory/next-steps.md)
  [ ] commit + push (push 는 사용자 명시 후)
```

---

## 6. 명령어 cheat sheet

```bash
npm run dev       # 개발 서버 http://localhost:3000
npm run build     # 프로덕션 빌드 (작업 후 필수)
npm run lint      # 린트 검사
git push          # Vercel auto deploy 트리거 (main project: anseunghyoks-projects/jimscanner-seller)
```

---

## 7. 환경변수 (현재 상태)

Vercel 등록됨:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `KOREAEXIM_API_KEY` (한국수출입은행 환율)
- `NEXT_PUBLIC_B2B_URL=https://seller.jimscanner.co.kr`

⏳ 미등록 (관련 기능 비활성):
- `RESEND_API_KEY` — 이메일 발송 안 됨
- `NTS_BUSINESS_API_KEY` — 사업자등록 진위확인 안 됨

로컬 `.env.local` 은 사용자가 본인 키 채워야 함 (`.env.example` 참고).

---

## 8. 도메인·배포 상태

- GitHub: https://github.com/anteam7/jimscanner-seller (private)
- Vercel project: `jimscanner-seller` (anseunghyoks-projects)
- 현재 prod URL: 임시 `https://jimscanner-seller-anseunghyoks-projects.vercel.app`
- 도메인 `seller.jimscanner.co.kr` ⏳ 사용자가 Vercel dashboard 에서 매핑 예정
- 매핑 완료 후 main repo (jimpass-agent-platform) 의 commit `bfa487f` 도 push 해야 함 (B2B rewrite 제거 반영)

---

## 9. 자주 하는 실수 방지

- `text-white` 를 본문에 쓰지 말 것 (다크 sidebar 안 또는 solid button 위만). 본문은 `text-slate-900/800/700/500/400` 계층
- 카드에 `shadow-sm` 빠뜨리지 말 것 (flat 느낌 — v2.1 패턴)
- `Link` 대신 `<a href="/...">` 쓰지 말 것 (SPA 깨짐, 페이지 state 초기화)
- `next/font/google` 추가 X — Pretendard 는 globals.css CDN @import 으로 충분
- B2C 의 라이트 톤 token (`--jim-bg-primary` 등) 은 globals.css 에 안 가져옴 — 이 repo 는 shadcn light + 자체 token
- 새 페이지 만들 때 `robots: { index: false }` 메타 잊지 말 것 (B2B 는 noindex)
- API route 에서 `createAdminClient` (service_role) 쓸 때 RLS 우회됨 — 사용자 권한 검증 직접 해야

---

## 10. 메인 repo 와의 sync 패턴

공유 자산 변경 시:

| 파일 | sync 방향 | 빈도 |
|---|---|---|
| `src/lib/auth/{client,server,admin-supabase}.ts` | 양쪽 sync | 드묾 |
| `src/lib/security/{safeFetchUrl,safeRedirect,safeXlsxParse}.ts` | 양쪽 sync | 드묾 |
| `src/lib/utils.ts` | 양쪽 sync | 거의 없음 |
| `src/components/ui/*` (shadcn) | 한쪽에서 추가 → 다른쪽 copy | 가끔 |
| `types/supabase.ts` | main 에서 `npm run gen:types` 후 이 repo 로 copy | DB 스키마 변경 시 |
| `supabase/b2b_*.sql` | 이 repo 가 권한자 | 새 마이그레이션 시 |

DB DDL 은 사용자 승인 후 main repo 의 `scripts/apply-sql.mjs` 로 실행.
