# 짐스캐너 SELLER (B2B SaaS)

구매대행·해외직구 사업자용 SaaS. 메인 짐스캐너 (B2C) 와 **DB 공유, 코드 분리**.

> **👉 새 작업 세션 시작 전 [`CLAUDE.md`](CLAUDE.md) → [`_memory/next-steps.md`](_memory/next-steps.md) 읽어주세요.**

## 핵심 가치 (MVP)

사업자가 의뢰자 주문을 받아 33개 한국 배대지의 각자 다른 신청 양식으로 자동 변환 + 엑셀 다운로드.

## 도메인·배포

- **prod**: `seller.jimscanner.co.kr` (별도 Vercel project — `jimscanner-seller`)
- DB: 메인 짐스캐너와 동일 Supabase (`obxvucyhzlakensopalf`, `b2b_*` 접두사 테이블)
- Auth: 같은 `auth.users` 풀 — B2C 회원이 B2B 가입 시 같은 user_id

## 실행

```bash
cp .env.example .env.local   # 값은 본인이 채워야 함
npm install
npm run dev                   # http://localhost:3000
```

## 주요 라우트

- `/login`, `/signup/step-1~6` — 가입·로그인 (6단계)
- `/dashboard` — 인증 후 홈
- `/settings/*` — 계정·보안(2FA)·법규
- `/billing/cancel`, `/pricing` — 구독 관리
- `/orders/*` ⏳ MVP 진행 중 (Stage 2b)

## 어드민

B2B 회원 관리·플랜·CS·공지는 **메인 짐스캐너 repo** (`jimpass-agent-platform`) 에서 운영 — `https://jimscanner.co.kr/admin/b2b-accounts` 등.

## 디자인 컨셉

라이트 메인 + 다크 사이드바 + Pretendard. 한국 sellers SaaS 표준 (샵링커·셀러허브 류). 상세는 [`_memory/design-system.md`](_memory/design-system.md).

## 메인 repo 와의 sync

| 자산 | sync 방향 |
|---|---|
| `src/lib/{auth, security, utils}` | 양쪽 수동 sync (드묾) |
| `src/components/ui/*` (shadcn) | 한쪽에서 추가 시 copy |
| `types/supabase.ts` | main 에서 `npm run gen:types` 후 copy |
| `supabase/b2b_*.sql` | 이 repo 가 권한자 |

## 컨텍스트 파일

- [`CLAUDE.md`](CLAUDE.md) — 작업 지시서 (세션 시작 시 필독)
- [`_memory/next-steps.md`](_memory/next-steps.md) — 다음 작업 큐
- [`_memory/design-system.md`](_memory/design-system.md) — 디자인 토큰·패턴
- [`_memory/session-log.md`](_memory/session-log.md) — 진행 이력
