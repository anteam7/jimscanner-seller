# main repo (jimpass-agent-platform) — agent infra 이식 가이드

이 문서는 main repo (`C:/Web/jimscanner/jimpass-agent-platform`) 에 같은 agent 인프라를 설치할 때 그 repo 의 Claude Code 세션에 그대로 던지는 setup prompt 다.

seller repo 의 agent 가 main repo 에 handoff issue 를 만들면 main repo agent 가 자동 처리하게 하기 위한 셋업.

---

## 사용자가 main repo 세션에서 실행하는 한 줄

```
C:/Web/jimscanner/jimpass-agent-platform 에 jimscanner-seller repo 의 agent infra 를 이식해줘.
참조 commit: anteam7/jimscanner-seller @ <SELLER_LATEST_COMMIT>
참조 문서: C:/Web/jimscanner-seller/scripts/agent/MAIN-REPO-SETUP.md
```

main repo 의 Claude Code 가 이 문서를 그대로 읽고 아래를 그대로 실행한다.

---

## 이식할 파일 (5개 + 1)

seller repo (`C:/Web/jimscanner-seller`) 에서 복사할 파일들을 main repo 의 같은 위치에 만든다.
**복사하지만 다음 한 가지 변경**: cron-prompt 에 "handoff-from-* issue polling" 단계 추가.

| 파일 | 변경 |
|---|---|
| `_memory/agent-decision-rules.md` | 그대로 복사. 마지막의 "Cross-repo" 섹션은 `from-seller` 대신 `from-main` 으로 표기 |
| `_memory/auto-queue.md` | 그대로 복사하되 P1 항목은 다 비우고 main repo 핵심만 채움 (아래 "main repo P1 초기 큐" 참조) |
| `scripts/agent/decision-needed.mjs` | 그대로 복사 |
| `scripts/agent/check-decision-reply.mjs` | 그대로 복사 |
| `scripts/agent/handoff-to-repo.mjs` | 그대로 복사 (main → seller 도 가능하게 양방향) |
| `scripts/agent/cron-prompt.md` | seller 의 cron-prompt 복사 + **"handoff polling" 단계 추가** (아래 참조) |
| `scripts/agent/README.md` | 그대로 복사. PAT 발급 URL · Task 등록 명령은 동일 |

`.env.example` 도 동일 변수 추가. `.env.local` 에 같은 PAT 사용:
```
AGENT_GITHUB_TOKEN=<seller 와 같은 PAT>
AGENT_GITHUB_REPO=anteam7/jimpass-agent-platform
AGENT_PRIMARY_EMAIL=anseunghyok@gmail.com
AGENT_PRIMARY_USERNAME=anteam7
AGENT_PRIMARY_PASS_LEGACY=an21243802
AGENT_PRIMARY_PASS_STRONG="An@124#802"
```

---

## 운영 정책 (seller 와 동일)

- **이슈 등록 주기**: daily (audit 03:00, brainstorm 05:00)
- **이슈 답신·close 확인 + 다음 진행 결정**: hourly (이 cron 의 책임)
- 매 회차 시작 시 GitHub 의 3개 label 카테고리 open issue 의 새 댓글·close 상태를 polling

## cron-prompt.md 의 추가 단계 (main 측)

seller 의 cron-prompt 를 복사하되 **"2. Issue Inbox Polling" 의 label 목록을 main repo 관점으로 교체**:

```markdown
## 2. Issue Inbox Polling (매 회차 필수)

매 hourly fire 시작 시 자기 repo 의 3개 label open issue 처리.

```bash
node -e "
const t = process.env.AGENT_GITHUB_TOKEN;
const repo = process.env.AGENT_GITHUB_REPO || 'anteam7/jimpass-agent-platform';
// main 측은 'agent-handoff-from-seller' (seller 가 보낸 작업) 받음
const labels = ['agent-decision-needed','agent-idea','agent-handoff-from-seller'];
for (const label of labels) {
  const r = await fetch('https://api.github.com/repos/' + repo + '/issues?labels=' + encodeURIComponent(label) + '&state=open&per_page=20', { headers: { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json' } });
  const items = await r.json();
  console.log(JSON.stringify({ label, count: items.length, issues: items.map(i => ({number:i.number, title:i.title, comments:i.comments, updated_at:i.updated_at})) }));
}
" --input-type=module
```

### 2-a. `agent-decision-needed` (큐 항목 결정 대기)
- 큐 항목이 `waiting_for: issue#<n>` 으로 묶여 있음
- `node scripts/agent/check-decision-reply.mjs --issue <n>` 호출 → approve/deny/skip/unknown 처리

### 2-b. `agent-idea` (brainstorm 발견)
- `approve` 댓글 → `_memory/auto-queue.md` P1 끝에 추가 + issue 에 `✅ 큐에 추가됨` 댓글
- `skip` / `deny` → issue close

### 2-c. `agent-handoff-from-seller` (seller repo 가 보낸 작업)
- main 측이 picking 해서 처리할 cross-repo 작업
- body 의 `<!-- agent-handoff-meta` 파싱 → spec_key 추출 → dedup
- P0 큐 상단에 추가 (decision_required: false, 우선 처리)
- 작업 완료 시 `✅ commit <hash> 에 처리됨` 댓글 + issue close

### Inbox polling 결과
- 새로 P1 / P0 에 추가된 항목 수
- close 된 issue 수
- 답신 없이 그대로 둔 open issue 수
- 위 정보를 b2b_auto_runs 의 change_summary 에 한 줄로 (main repo 의 같은 테이블)
```

---

## main repo P1 초기 큐 (핵심만)

`_memory/auto-queue.md` 의 P1 에 채울 항목:

```markdown
### 초기 어드민 보강 (핵심)

- [ ] **#1 /admin/b2b-accounts 검색 + 필터 보강**
  - 검색: 사업자명 / 이메일 / 사업자등록번호
  - 필터: 인증 단계 / plan / 정지 여부
  - estimated: 1h

- [ ] **#2 /admin/b2b-auto-runs 페이지 보강 — agent 활동 가시화**
  - b2b_auto_runs 테이블 최근 100건 + filter (mode/task_status/decision_needed)
  - estimated: 1h

- [ ] **#3 어드민 sidebar 에 "B2B 셀러" 그룹 정리**
  - /admin/b2b/accounts /admin/b2b/health /admin/b2b/support
  - estimated: 30m

### handoff 처리 시 즉시 picking — 우선 통로 보장
```

(이건 main repo 의 자체 P1. seller 측에서 보낸 handoff 는 P0 로 자동 import.)

---

## main repo PAT 검증 명령

세팅 끝나면 main repo 에서:

```bash
# 자기 repo 에 self-test issue
node scripts/agent/decision-needed.mjs \
  --title "[TEST] main repo agent infra 동작 확인" \
  --body "main repo 의 agent 인프라 정상" \
  --labels "agent-decision-needed,test"

# seller repo 로 handoff (cross-repo 양방향 검증)
node scripts/agent/handoff-to-repo.mjs \
  --to-repo anteam7/jimscanner-seller \
  --title "[from-main] dry-run handoff 검증" \
  --body "main → seller handoff 양방향 동작" \
  --labels "agent-handoff-from-main,test" \
  --spec-key "dry-run-cross-handoff-2026-05-25"
```

둘 다 issue 가 만들어지면 양방향 OK.

---

## Windows 작업 스케줄러 등록 (main 측)

```powershell
$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"Set-Location 'C:\Web\jimscanner\jimpass-agent-platform'; & claude -p 'scripts/agent/cron-prompt.md 의 instruction 을 따라 한 회차 작업하고 종료해.' *>> logs\agent-cron.log`""

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes 60)

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -DontStopIfGoingOnBatteries `
  -AllowStartIfOnBatteries `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask `
  -TaskName "jimpass-agent-platform-agent" `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "main repo 24h 자율 agent (handoff 처리 + 자체 P1)" `
  -Force
```

→ seller agent 와 동일 60분 주기. seller 는 정각·30분 출발이면 main 은 15분·45분 출발로 어긋나게 (정확한 timing 은 등록 시점 따라 자연 어긋남).

---

## 검증 후 완료 보고

main repo 에서 작업 끝나면 seller repo 의 [#1 setup verification issue](https://github.com/anteam7/jimscanner-seller/issues/1) 에 다음 댓글:

```
✅ main repo agent infra 이식 완료
- 이식 commit: <main-commit-hash>
- 검증 dry-run issue: <main repo issue 번호>
- 양방향 handoff 확인: <seller repo issue 번호>
- Windows Task 등록: jimpass-agent-platform-agent (state=Ready, next-run=...)
```

이걸 보면 seller agent 가 다음 회차에 Phase 0 의 handoff issue 들을 진짜로 생성할 수 있음을 확신함.
