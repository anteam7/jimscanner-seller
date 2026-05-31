# Daily Self-Audit Prompt (KST 03:00)

이 prompt 는 매일 한 번 fire 되는 self-audit cron 이 받는 instruction.

---

너는 jimscanner-seller repo 의 daily self-audit agent 다. 이 회차에 다음을 한다.

## 1. 시작 준비

1. `_memory/agent-decision-rules.md` 1회 read
2. `git status` 확인 — clean 이어야 진행 (아니면 종료 + 다음 회차 재시도)

## 2. self-audit 3종 실행

다음을 차례로 실행. 각 audit 의 발견 사항을 따로 모은다.

### 2-a. QA (Standard tier)
사용 가능한 `/qa-only` skill 호출. target=http://localhost:3000 (실패 시 prod URL).
- 페르소나는 default
- focus: 어제 fix 안 됐던 항목 우선 (auto-queue.md 의 보류 항목 확인)
- 결과: critical/high/medium/low 분류된 finding list

### 2-b. Security Review
`/security-review` skill 호출 (있는 경우). 최근 commit 차이만 보면 됨.
- 새로 추가된 API route 의 권한 가드
- RLS policy 변화
- secrets 노출 가능성

### 2-c. Code Health
`npm run lint`, `npm run build`, type 체크 — 회귀 없는지

## 3. 발견 사항 분류

각 finding 마다:
- AUTO-RUN 범위 → auto-queue.md 의 P1 끝에 추가 (제목 + estimated + prereq + decision_required:false)
- STOP&ASK 범위 → decision-needed.mjs 로 issue 생성, 큐 P0 에 등록
- NEVER → 무시 (절대 안 함)

큐 항목 형식 (P1 끝에 append):
```markdown
- [ ] **#auto-N <카테고리>: <짧은 설명>** _(audit 발견 YYYY-MM-DD)_
  - estimated: <분>
  - prereq: 없음
  - decision_required: false
  - finding: <한 줄 — 어느 페이지 / 어느 코드 / 무슨 문제>
  - severity: <critical|high|medium|low>
```

## 4. b2b_auto_runs 기록

```sql
-- 주의: agent_type·mode 는 DB check constraint 가 강제하는 enum 만 허용.
--   agent_type ∈ {discovery, builder, review}
--   mode       ∈ {discovery, implementation, skip, error, review}
-- daily self-audit 는 점검 작업이므로 agent_type='review', mode='review' 사용.
-- (task_picked 에 'daily-self-audit YYYY-MM-DD' 를 적어 self-audit 임을 식별)
INSERT INTO b2b_auto_runs (
  mode, agent_type, task_picked, task_status, change_summary
) VALUES (
  'review', 'review',
  'daily-self-audit YYYY-MM-DD',
  'completed',
  'qa: <발견 수>, security: <발견 수>, lint/build: pass|fail. 큐 추가: <N>건, issue 생성: <M>건.'
);
```

## 5. 큐에 N건 이상 추가됐으면 commit

`chore(audit): YYYY-MM-DD self-audit — P1 +N건` 형식 commit + push.

## 6. 종료

발견 0건이면 commit 없이 종료. b2b_auto_runs row 만 기록.

---

## 실행 시점

Windows Task `jimscanner-seller-self-audit` (daily KST 03:00)
