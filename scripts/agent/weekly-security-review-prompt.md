# Weekly Security Review Prompt (KST Wed 03:00)

매주 수요일 한 번 fire 되는 security review cron 이 받는 instruction. 지난 일주일에 추가·수정된 API route / 마이그레이션 / RLS policy 위주로 깊게 본다. daily self-audit 의 가벼운 `/security-review` 와 다르게, **변경된 surface 전체를 코드 read 까지 들어가서** 점검한다.

---

너는 jimscanner-seller repo 의 weekly security review agent 다. 이 회차에 다음을 한다.

## 1. 시작 준비

1. `_memory/agent-decision-rules.md` 1회 read — fix 범위 판단 기준
2. `git status` 확인 — clean 상태가 아니면 종료 + 다음 주 재시도
3. 지난 7일 commit log 수집:
   ```bash
   git log --since="7 days ago" --pretty=format:"%h %s" --no-merges
   git diff --stat HEAD@{7.days.ago} HEAD -- "src/app/api/**" "supabase/**" "src/lib/auth/**" "src/lib/security/**"
   ```
   - 신규/수정 API route, SQL 마이그레이션, auth/security helper 변경 list 확보

## 2. Security Review 실행

가용 `/security-review` (또는 `/cso` daily) skill 호출. scope:

### 2-a. 새 API route 점검
지난 7일 추가·수정된 `src/app/api/**/route.ts` 파일별로:
- 권한 가드 — `requireAuth()` / `requireAdmin()` 호출 누락 여부
- service_role 사용 시 — RLS 우회 후 사용자 권한 직접 검증하는지
- 입력 검증 — body parsing 후 zod / 수동 validation
- output 에 PII 노출 — buyer_phone / buyer_address / business_no 마스킹

### 2-b. SQL 마이그레이션 점검
지난 7일 `supabase/b2b_*.sql` 신규 파일 / 함수 / view:
- 새 테이블에 RLS enable + policy 1개 이상
- SECURITY DEFINER 함수에 `SET search_path = public, pg_temp` 명시
- SECURITY DEFINER 함수 EXECUTE grant 가 service_role / authenticated 중 의도된 범위인지
- view 가 security_invoker 또는 security_definer 명시인지

### 2-c. Supabase advisor 재확인
Supabase MCP `get_advisors` (type='security') 호출 → 새로 등장한 ERROR/WARN finding 수집.
daily self-audit 에서 이미 잡힌 항목은 dedup.

### 2-d. secrets / .env 검색
지난 7일 commit 의 diff 에서:
- `sk-`, `eyJ...`, service_role key pattern, GitHub PAT pattern 등장 여부
- `.env*` 파일 commit 여부
- console.log / log 메시지에 token 출력 여부

## 3. 발견 사항 분류

각 finding 마다 `agent-decision-rules.md` 에 따라:

### critical/high — 즉시 fix 시도
- AUTO-RUN 범위 (RLS 추가, search_path 추가, EXECUTE REVOKE, console.log 제거 등) → 이 회차에서 직접 fix + commit
- STOP&ASK 범위 (큰 권한 모델 변화, 컬럼 삭제, 사용자 강제 logout 등) → `decision-needed.mjs` 로 issue 생성, 큐 P0 에 등록

### medium/low — 큐에 추가만
auto-queue.md 의 P1 끝에 추가:
```markdown
- [ ] **#sec-N <카테고리>: <짧은 설명>** _(weekly security review 발견 YYYY-MM-DD)_
  - estimated: <분>
  - prereq: 없음
  - decision_required: false
  - finding: <한 줄 — 어느 파일 / 어떤 결함 / 영향>
  - severity: <medium|low>
```

## 4. fix 한 항목 commit

immediate fix 가 있으면 별도 commit 으로 push:
```
[AGENT-AUTO] sec-fix: <짧은 설명>

회차: weekly-security-review YYYY-MM-DD
finding severity: <critical|high>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

한 회차에 5건 이상 fix commit 하지 말 것 — 집중력 분산. 그 이상은 P1 큐로 미룸.

## 5. b2b_auto_runs 기록

Supabase MCP `execute_sql`:
```sql
INSERT INTO b2b_auto_runs (
  mode, agent_type, task_picked, task_status,
  change_summary, next_direction
) VALUES (
  'review', 'review',
  'weekly-security-review YYYY-MM-DD',
  'completed',
  'critical:<n> high:<n> medium:<n> low:<n>, fix +<n> commit, 큐 추가 <m>건, issue 생성 <k>건',
  '<다음 주 우선 점검 영역 또는 빈 문자열>'
);
```

- `mode` enum: `review` (audit / security 점검)
- `agent_type` 제약: `builder` / `review` / `discovery` 만 허용 — security review 는 `review`

## 6. 큐 변경이 있으면 별도 commit

발견을 큐에 추가했으면:
```
chore(audit): weekly-security-review YYYY-MM-DD — P1 +<n>건
```

발견 0건이면 commit 없이 종료. b2b_auto_runs row 만 기록.

## 7. 절대 하지 마

- `agent-decision-rules.md` 의 NEVER 항목
- 셀러 데이터 직접 SELECT 또는 issue body 로 출력
- secrets 본문을 fix 과정에서 log·issue 에 노출 (REVOKE 후 새 key 발급 절차로 STOP&ASK 전환)
- 한 회차에 5건 이상 fix commit (집중력 분산) — 그 이상은 P1 큐로 미룸

---

## 실행 시점

Windows Task `jimscanner-seller-weekly-security-review` (weekly Wed KST 03:00 = UTC Tue 18:00).

등록 명령 (PowerShell):
```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"Set-Location 'C:\Web\jimscanner-seller'; & claude --dangerously-skip-permissions -p 'scripts/agent/weekly-security-review-prompt.md 의 instruction 을 따라 한 회차 작업하고 종료해.' *>> logs\agent-weekly-security-review.log`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Wednesday -At 3am
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries `
  -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2)
Register-ScheduledTask -TaskName "jimscanner-seller-weekly-security-review" -Action $action -Trigger $trigger -Settings $settings -Description "주간 security review — 신규 API/마이그레이션/RLS 점검" -Force
```

권장 실행 시간 한도: 2시간 (지난 일주일 변경 분량 read + fix 최대 5건).
