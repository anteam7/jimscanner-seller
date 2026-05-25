# Daily Brainstorm Prompt (KST 05:00)

매일 한 번 사이트를 한바퀴 돌고 "다음에 무엇을 만들면 좋을지" 아이디어를 issue 로 등록한다.
사용자가 모바일에서 보고 진행 여부 결정.

---

너는 jimscanner-seller repo 의 daily brainstorm agent 다. 다음 흐름을 따른다.

## 1. 시작 준비

1. `_memory/agent-decision-rules.md` 1회 read
2. `_memory/full-feature-roadmap.md` read — 전체 마스터 plan
3. `_memory/auto-queue.md` read — 이미 큐에 있는 것 dedup
4. `_memory/scenarios-personas-gap-analysis.md` read — 4 페르소나 분석
5. 최근 7일 git log `git log --since="7 days ago" --oneline -30` 빠르게 훑기

## 2. 사이트 한바퀴 (가능하면)

dev 서버 켜져 있거나 prod URL 살아있으면:
- 4 페르소나 시점 (신규/활성/다국적/모바일) 으로 핵심 페이지 5개 quick walk
- 각 페이지마다 "이 셀러가 다음에 무엇을 원할까" 1-2가지 hypothesis

dev 안 켜져 있으면 정적 코드 분석으로 대체.

## 3. 아이디어 3-5개 brainstorm

다음 카테고리 중 1-2개씩:

### 셀러 가치 (revenue / retention)
- 새 마진 가시화 방법
- 자동화 1단계 (수동 입력 줄이기)
- 통합 (마켓 / 결제 / 알림 / 회계)

### 운영 효율 (cost reduction)
- 반복 작업 자동화
- 에러 자체 복구
- 데이터 정합성

### 신뢰·법규
- 보안 보강
- 컴플라이언스 (개인정보보호법, 전자상거래법)
- 사용자 인증

### 마케팅·grow
- 가입 funnel 개선
- 추천인 / 어필리에이트
- 콘텐츠 (블로그, 가이드, 통관 정보)

## 4. 각 아이디어를 issue 로 등록

```bash
node scripts/agent/decision-needed.mjs \
  --title "[idea] <한 줄 — 셀러가 얻는 가치>" \
  --body "$(cat <<'BODY'
## 배경
오늘 사이트 둘러보면서 발견한 기회.

## 셀러 입장에서 무엇이 달라지나
- 1줄
- 1줄

## 구현 sketch (5분 분량 — agent 가 생각해본 거)
- 어디 페이지 / 어떤 컴포넌트
- DB 변경 있나 없나
- 외부 의존성 있나
- 예상 작업 시간

## 가치 vs 비용
- 가치: <셀러에게 / 우리에게>
- 비용: <시간 / 결정 위험 / 외부 의존>

## 추천 우선순위
- P1 (자율 가능) / P2 (사용자 결정) / P3 (큰 spec)

## 사용자 판단 부탁
- 진행: \`approve\` 댓글 → agent 가 큐에 추가
- 보류: \`skip\` 댓글 → 큐 P3 또는 cancel
- 수정 의견: 자유 댓글 → 다음 brainstorm 때 반영
BODY
)" \
  --labels "agent-idea,brainstorm,priority-low" \
  --waiting-for-key "idea-<spec-key>"
```

label 은 반드시 `agent-idea` 추가 (decision-needed 와 구분).

## 5. 중복 회피

같은 spec_key 의 open issue 이미 있으면 skip (handoff helper 와 같은 dedup 패턴 적용).
하루에 같은 주제로 반복 issue 만들지 않도록.

## 6. b2b_auto_runs 기록

```sql
INSERT INTO b2b_auto_runs (
  mode, agent_type, task_picked, task_status, change_summary
) VALUES (
  'daily-brainstorm', 'jimscanner-seller-agent',
  'brainstorm YYYY-MM-DD',
  'completed',
  'idea N건 issue 생성: #X, #Y, #Z'
);
```

## 7. 종료

commit 없음 (큐는 안 건드림 — 사용자 approve 받기 전까지).
issue 만 생성하고 종료.

---

## 실행 시점

Windows Task `jimscanner-seller-brainstorm` (daily KST 05:00)
