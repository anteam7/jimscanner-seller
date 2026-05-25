# Agent 위임 규칙 (Decision Rules)

마지막 갱신: 2026-05-25
참조 주기: 매 cron fire 시 1회 read 필수

이 문서는 자율 agent (이 repo 의 24h cron) 가 "스스로 결정할 일" vs "사용자에게 물어볼 일" 을 가르는 기준이다.
모호하면 **default = STOP & ASK**. 의심스러우면 묻는 쪽으로 기운다.

---

## 🛑 STOP & ASK — 반드시 사용자 confirm 후 진행

`scripts/agent/decision-needed.mjs` 로 GitHub issue 자동 생성 → 사용자 답신 대기 → 다음 회차 reopen.

### 1. 비용 발생
- Anthropic / OpenAI / 기타 API credit 충전
- Vercel Hobby → Pro upgrade, Supabase Free → Pro
- 도메인 신규 구매, 갱신
- 유료 SaaS 가입 (월정액 1$ 이상)
- 광고 집행 (구글/네이버/카카오)

### 2. 비가역 액션
- `DROP TABLE`, `TRUNCATE`, `DELETE` 전체 행 (WHERE 없거나 광범위)
- `git push --force` to main / develop
- 도메인 양도, GitHub repo 삭제·visibility 변경
- production env 변수 삭제
- 셀러 계정 강제 삭제 (Supabase admin DELETE user)

### 3. 사용자 신원 사용
- anseunghyok@gmail.com 으로 신규 서비스 가입
  - 가입 자체는 사용자가 사전 허락함 (anteam7/an21243802 또는 An@124#802 시도 가능)
  - **단 "어디에 무엇을 위해 가입했는지" 는 반드시 issue 생성으로 기록**
- 사업자 정보 (사업자등록번호, 대표자명 등) 외부 노출
- 카드 등록, 결제 동의

### 4. PII / 보안 / 컴플라이언스
- 셀러 PII 컬럼 (buyer_phone, buyer_address, business_no 등) 스키마 변경
- RLS policy 완화·삭제
- service_role 키가 client bundle 에 노출될 가능성 있는 변경
- `.env*` 키 변경·삭제 (추가는 OK)
- 약관·개인정보처리방침 본문 변경
- 새 외부 서비스에 PII 송출 (분석 도구, CRM 등)

### 5. 큰 아키텍처 변경
- 새 외부 서비스 의존 추가 (다른 cloud, 다른 DB)
- 새 repo 생성, 새 도메인·서브도메인 추가
- 10+ 컬럼 스키마 마이그레이션
- Next.js / React 메이저 업그레이드
- 의존성 메이저 업데이트 (npm major)
- 새 인증 방식, 새 라우팅 구조

### 6. 셀러 입장에서 큰 UX 변화
- 사이드바 메뉴 추가·삭제
- 가격 정책 변경
- 기존 사용자에게 깨질 가능성 있는 데이터 model 변경

---

## ✅ AUTO-RUN — 자율 진행 (보고만 commit log + activity log)

### 코드 품질
- 버그 fix (재현 가능한 명확한 경우)
- 리팩토링 (기능 동일, 가독성·성능 개선)
- 타입 보강, lint 에러 fix
- dead code 제거
- 주석 정리 (CLAUDE.md 규칙 — 불필요한 주석 삭제)

### UI Polish
- 디자인 시스템 (`_memory/design-system.md`) 패턴 적용
- 반응형 보강, WCAG 보강
- 로딩 상태, 빈 상태, 에러 상태 개선
- 마이크로 인터랙션 (hover, transition)

### 데이터·DB
- 인덱스 추가
- view, materialized view 생성
- function, trigger 추가 (단 idempotent 보장)
- 작은 마이그레이션 (1~5 컬럼 추가 + RLS 같이)
- 시드 데이터 보강 (기존 테이블)

### 인프라
- 의존성 minor·patch update
- 빌드·테스트 추가
- CI 설정 개선
- 환경 변수 추가 (기존 키 활용)

### 자체 점검
- `/qa`, `/review`, `/investigate`, `/security-review` 정기 실행
- 발견 이슈 자동 fix (위 AUTO-RUN 범위 내)
- 발견 후 fix 가 STOP&ASK 범위면 GitHub issue 생성으로 전환

### 외부 서비스 (사전 허락된 자격증명 사용)
- 기존 등록된 API key 로 호출
- 기존 가입된 서비스 (Resend, Vercel) 의 read 액션
- Supabase MCP `execute_sql` (SELECT)
- Supabase MCP `apply_migration` (위 AUTO-RUN 범위 내 변경)

---

## ⚠️ AUTO-RUN BUT REPORT — 자율이지만 별도 알림 (commit + issue not for blocking, just for notice)

### 코드·UI 추가
- 새 컴포넌트, 새 페이지 (라우트)
- 새 b2b_* 테이블 추가 (RLS 같이 — 같이 안 하면 STOP&ASK)
- 새 API route 추가
- 새 마이그레이션 (10 컬럼 미만)

### 의존성
- npm 패키지 신규 추가 (검증된 publisher 한정 — supabase/, anthropic/, sharp, next/, react/ 같은 주요 publisher)
- 검증 안 된 publisher → STOP&ASK

---

## ❌ NEVER — 절대 금지 (사용자 confirm 도 받지 마)

- Anthropic API key, Supabase service_role, GitHub PAT 등 시크릿을 commit / log / issue body 에 평문 출력
- 사용자 password 평문 노출
- 셀러 PII 본문을 issue / commit / log 에 노출
- 외부 사이트에서 셀러 데이터 게시 (Stack Overflow, Discord 등)
- 백업 없이 destructive migration

---

## 결정 트리 (모호할 때)

```
변경이 사용자에게 보이는가?
├─ No → AUTO-RUN (코드 품질 / 인프라 / 시드)
└─ Yes
    ├─ 비가역? → STOP&ASK
    ├─ 비용 발생? → STOP&ASK
    ├─ 셀러 데이터 모델 변경? → STOP&ASK
    ├─ 새 페이지/컴포넌트/route? → AUTO-RUN BUT REPORT
    └─ 기존 UI 의 폴리시? → AUTO-RUN
```

---

## GitHub Issue 생성 패턴

```bash
node scripts/agent/decision-needed.mjs \
  --title "P0: Resend 가입해서 RESEND_API_KEY 받기" \
  --body "환율 알림 / critical 알림용 이메일 발송 필요. resend.com 에 anseunghyok@gmail.com 으로 가입 진행해도 될까요?" \
  --labels "agent-decision-needed,priority-medium" \
  --waiting-for-key "resend_signup"
```

issue 생성되면 큐의 해당 작업은 `status: waiting_for: issue#<num>` 으로 mark.
다음 cron 회차 시 issue 댓글 (사용자 답신) 확인 → 진행 또는 skip.

24h 답신 없으면 큐 다음 항목으로 넘어감 (issue 는 open 상태 유지).

---

## 자격증명 사용 규칙

`.env.local` 에서만 읽음. `_memory/*.md` 에 평문 저장 절대 금지.

| 변수 | 용도 |
|---|---|
| `AGENT_PRIMARY_EMAIL` | 외부 가입 시 사용 |
| `AGENT_PRIMARY_USERNAME` | login 시도용 (이미 가입된 서비스) |
| `AGENT_PRIMARY_PASS_LEGACY` | 구 비밀번호 |
| `AGENT_PRIMARY_PASS_STRONG` | 신 비밀번호 (강도 정책 충족 시) |
| `AGENT_GITHUB_TOKEN` | issue create / comment read 용 PAT |

신규 가입 후 받은 API key 는 즉시 `.env.local` 에 append + commit X.

---

## 변경 이력

- 2026-05-25: v1.0 작성 (24h 자율 에이전트 위임 체계 P0 인프라)
