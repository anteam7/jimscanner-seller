# Agent Scripts — 24h 자율 운영

이 디렉토리는 jimscanner-seller repo 의 24h 자율 agent 운영 도구.

## 빠른 시작 (사용자가 한 번만)

### 1. GitHub Personal Access Token 발급

https://github.com/settings/tokens/new?scopes=repo&description=jimscanner-seller-agent

- scope: `repo` 만 체크
- expiration: 90일 또는 No expiration
- 발급된 token 을 복사 → `.env.local` 의 `AGENT_GITHUB_TOKEN=` 뒤에 붙여넣기

### 2. 동작 점검

```bash
# 테스트 issue 1개 생성
node scripts/agent/decision-needed.mjs \
  --title "test: agent 인프라 동작 확인" \
  --body "이 issue 가 보이면 agent 인프라가 정상입니다. 닫아주세요." \
  --labels "agent-decision-needed,test"
# stdout 에 issue 번호 출력되면 성공
```

생성된 issue 가 https://github.com/anteam7/jimscanner-seller/issues 에 보이면 OK.

### 3. Windows 작업 스케줄러 등록

작업 스케줄러 → 새 작업 만들기:
- 이름: `jimscanner-seller-agent`
- 트리거: 시작 시점 = 작업 만든 직후, 반복 = 1시간, 지속 시간 = 무기한
- 동작:
  - 프로그램: `cmd.exe`
  - 인수: `/c cd /d C:\Web\jimscanner-seller && claude -p "scripts/agent/cron-prompt.md 의 instruction 을 따라 한 회차 작업하고 종료해." >> logs/agent-cron.log 2>&1`
- 조건: "AC 전원 사용 시만 실행" 체크 해제 (배터리에서도 진행)
- 설정: "작업이 이미 실행 중인 경우 새 인스턴스 시작 안 함" 체크

또는 PowerShell `Register-ScheduledTask` 명령:
```powershell
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument '/c cd /d C:\Web\jimscanner-seller && claude -p "scripts/agent/cron-prompt.md 의 instruction 을 따라 한 회차 작업하고 종료해." >> logs/agent-cron.log 2>&1'
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 60)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName "jimscanner-seller-agent" -Action $action -Trigger $trigger -Settings $settings -Description "24h 자율 agent — _memory/auto-queue.md 처리"
```

## 파일 구조

| 파일 | 역할 |
|---|---|
| `cron-prompt.md` | 매 fire 시 Claude Code 가 받는 instruction |
| `decision-needed.mjs` | STOP&ASK 트리거 → GitHub issue 자동 생성 |
| `check-decision-reply.mjs` | issue 의 사용자 답신 댓글 확인 |
| `README.md` | 이 문서 |

## 운영 관찰

### 매일 확인할 곳
- **GitHub Issues** (label `agent-decision-needed`): https://github.com/anteam7/jimscanner-seller/issues?q=is%3Aissue+label%3Aagent-decision-needed
- **git log**: `git log --oneline --grep "AGENT-AUTO" -20`
- **DB**: `b2b_auto_runs` 테이블 — 향후 `/admin/agent-runs` 페이지로 시각화 예정

### cron 로그
`logs/agent-cron.log` (작업 스케줄러 출력 redirect — Phase P0-3 에서 자동 생성 안 됨, 수동으로 `mkdir logs` 한 번)

### 큐 직접 편집
`_memory/auto-queue.md` 를 사용자가 직접 수정 가능. 다음 fire 부터 반영.

## 사용자 답신 방법 (issue 에 댓글)

agent 가 만든 issue 에 댓글로 다음 중 하나:
- `approve` / `yes` / `ok` / `go` / `진행` / `예` / `승인` → agent 진행
- `deny` / `no` / `stop` / `중단` / `거절` → 작업 cancel
- `skip` / `later` / `미루` / `보류` → 7일 후 재시도
- 그 외 자유로운 본문 → agent 가 분석 시도 (모호하면 추가 질문)

24h 답신 없으면 큐 다음 항목으로 자연히 넘어감 (issue open 상태 유지).

## 정지·재개

### 일시 정지
Windows 작업 스케줄러에서 task `jimscanner-seller-agent` 우클릭 → 사용 안 함.

### 큐 비우기 (강제 idle)
`_memory/auto-queue.md` 의 모든 P1 항목을 `[x]` 로 마킹 또는 P3 로 이동.

### 영구 종료
작업 스케줄러에서 task 삭제 + `Unregister-ScheduledTask -TaskName "jimscanner-seller-agent" -Confirm:$false`.
