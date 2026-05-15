# 짐스캐너 B2B (Seller)

구매대행·해외직구 사업자를 위한 SaaS. 메인 짐스캐너 (B2C) 와 분리된 별도 Vercel 프로젝트.

## 도메인

- prod: `seller.jimscanner.co.kr`
- DB: 메인 짐스캐너와 동일한 Supabase 프로젝트 공유 (b2b_* 접두사 테이블)

## 실행

```bash
cp .env.example .env.local
# .env.local 값 채우기 (Supabase·Resend·NTS·KOREAEXIM)
npm install
npm run dev   # http://localhost:3000
```

## 주요 라우트

- `/login`, `/signup/step-1~6` — 가입·로그인
- `/dashboard` — 인증 후 홈
- `/settings/*` — 계정·보안(2FA)·법규
- `/billing/cancel`, `/pricing` — 구독 관리
- `/api/*` — REST API (signup/auth/orders/settings/billing/exchange-rate/verify-business)

## 공유 자산 (main repo 와 동기 필요)

수동 sync — 변경 시 양쪽 반영:
- `src/lib/auth/{client,server,admin-supabase}.ts`
- `src/lib/security/{safeFetchUrl,safeRedirect,safeXlsxParse}.ts`
- `src/lib/utils.ts`
- `src/components/ui/*` (shadcn)
- `types/supabase.ts` (auto-gen, main 에서 `npm run gen:types` 후 copy)

## 어드민

B2B 회원 관리·플랜 설정·CS·공지 등 어드민 페이지는 **메인 짐스캐너 repo** 에서 운영 (`https://jimscanner.co.kr/admin/...`).

## DB 스키마

- `supabase/b2b_schema.sql` — 핵심 테이블 (accounts, terms, subscriptions, plans, audit_log, documents, orders 등)
- `supabase/b2b_auto_runs*.sql` — cron 로깅 (메인 repo 의 admin/b2b-auto-runs 페이지에서 조회)
- `supabase/functions/{billing-lifecycle,ticket-escalation}` — Edge Function
