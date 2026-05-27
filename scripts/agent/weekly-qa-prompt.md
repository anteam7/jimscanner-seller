# Weekly QA Prompt (KST Mon 03:00)

매주 월요일 한 번 fire 되는 QA cron 이 받는 instruction. 4 페르소나 시점으로 사이트를 돌면서 발견한 critical/high 는 즉시 fix, medium 이하는 P2 큐에 추가.

---

너는 jimscanner-seller repo 의 weekly QA agent 다. 이 회차에 다음을 한다.

## 1. 시작 준비

1. `_memory/agent-decision-rules.md` 1회 read — fix 범위 판단 기준
2. `_memory/design-system.md` 1회 read — 디자인 일관성 비교 baseline
3. `git status` 확인 — clean 상태가 아니면 종료 + 다음 주 재시도
4. dev 서버 켜져 있는지 확인 — 없으면 `npm run dev` 백그라운드 띄움. 안 뜨면 prod URL (https://seller.jimscanner.co.kr 또는 임시 vercel URL) 로 대체

## 2. QA Standard tier 실행

가용 `/qa-only` (gstack-qa-only) skill 호출:
- target: http://localhost:3000 (실패 시 prod URL)
- tier: standard (critical + high + medium)
- 페르소나 4종 quick walk:
  1. 신규 셀러 (가입 직후, SKU 0건, 주문 0건)
  2. 활성 셀러 (이번 달 주문 50건, 매칭 80%)
  3. 다국적 셀러 (USD/JPY/CNY 혼재)
  4. 모바일 셀러 (좁은 viewport, 한 손 조작)

각 페르소나별로 핵심 페이지 5개 quick walk:
- /dashboard
- /orders
- /orders/bulk
- /products
- /forwarders 또는 /settings

screenshot + 발견 사항 list 수집.

## 3. 발견 사항 분류

각 finding 마다 `agent-decision-rules.md` 에 따라:

### critical/high — 즉시 fix 시도
- AUTO-RUN 범위 (코드 품질, UI polish, lint 에러 등) → 이 회차에서 직접 fix + commit
- STOP&ASK 범위 (큰 UX 변화, 비용 발생 등) → `decision-needed.mjs` 로 issue 생성, 큐 P0 에 등록

### medium/low — 큐에 추가만
auto-queue.md 의 P1 끝에 추가 (격주~월간 처리):
```markdown
- [ ] **#qa-N <카테고리>: <짧은 설명>** _(weekly QA 발견 YYYY-MM-DD)_
  - estimated: <분>
  - prereq: 없음
  - decision_required: false
  - finding: <한 줄 — 어느 페이지 / 어떤 버그 / 재현 경로>
  - severity: <medium|low>
```

## 4. fix 한 항목 commit

immediate fix 가 있으면 별도 commit 으로 push:
```
[AGENT-AUTO] qa-fix: <짧은 설명>

회차: weekly-qa YYYY-MM-DD
finding severity: <critical|high>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## 5. b2b_auto_runs 기록

Supabase MCP `execute_sql`:
```sql
INSERT INTO b2b_auto_runs (
  mode, agent_type, task_picked, task_status,
  change_summary, next_direction
) VALUES (
  'weekly-qa', 'jimscanner-seller-agent',
  'weekly-qa YYYY-MM-DD',
  'completed',
  'critical:<n> high:<n> medium:<n> low:<n>, fix +<n> commit, 큐 추가 <m>건, issue 생성 <k>건',
  '<다음 주 우선 점검 영역 또는 빈 문자열>'
);
```

## 6. 큐 변경이 있으면 별도 commit

발견을 큐에 추가했으면:
```
chore(audit): weekly-qa YYYY-MM-DD — P1 +<n>건
```

발견 0건이면 commit 없이 종료. b2b_auto_runs row 만 기록.

## 7. 절대 하지 마

- `agent-decision-rules.md` 의 NEVER 항목
- 큰 UI 변경 (사이드바·라우트·페이지) 을 fix 명목으로 진행 → STOP&ASK
- production DB 의 셀러 데이터 직접 수정
- 한 회차에 5건 이상 fix commit (집중력 분산) — 그 이상은 P1 큐로 미룸

---

## 실행 시점

Windows Task `jimscanner-seller-weekly-qa` (weekly Mon KST 03:00 = UTC Sun 18:00).

등록 명령 (PowerShell):
```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"Set-Location 'C:\Web\jimscanner-seller'; & claude --dangerously-skip-permissions -p 'scripts/agent/weekly-qa-prompt.md 의 instruction 을 따라 한 회차 작업하고 종료해.' *>> logs\agent-weekly-qa.log`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 3am
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries `
  -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 3)
Register-ScheduledTask -TaskName "jimscanner-seller-weekly-qa" -Action $action -Trigger $trigger -Settings $settings -Description "주간 QA — 4 페르소나 walk + fix" -Force
```

권장 실행 시간 한도: 3시간 (페르소나 4 × 페이지 5 = 20 walk, 평균 5분 + fix 1시간).
