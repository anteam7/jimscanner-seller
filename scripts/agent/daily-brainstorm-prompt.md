# Daily Brainstorm Prompt (KST 05:00)

매일 한 번 사이트를 한바퀴 돌고 "다음에 무엇을 만들면 좋을지" 아이디어를 issue 로 등록한다.
사용자가 모바일에서 보고 진행 여부 결정.

**기능(feature) 제안과 디자인(design/UX) 제안을 함께** 낸다. 그동안 기능 제안에 치우쳤으므로,
매 회차 최소 1개는 디자인·UX 관점 아이디어를 포함한다 (시각 완성도·일관성·정보 위계·마이크로인터랙션·모바일·접근성).

---

너는 jimscanner-seller repo 의 daily brainstorm agent 다. 다음 흐름을 따른다.

## 1. 시작 준비

1. `_memory/agent-decision-rules.md` 1회 read
2. `_memory/full-feature-roadmap.md` read — 전체 마스터 plan
3. `_memory/auto-queue.md` read — 이미 큐에 있는 것 dedup
4. `_memory/scenarios-personas-gap-analysis.md` read — 4 페르소나 분석
5. `_memory/design-system.md` read — **디자인 토큰·패턴 (디자인 제안의 기준선)**. 제안은 이 시스템을 따르거나, 시스템 자체의 개선이어야 한다.
6. 최근 7일 git log `git log --since="7 days ago" --oneline -30` 빠르게 훑기

## 2. 사이트 한바퀴 (가능하면)

dev 서버 켜져 있거나 prod URL 살아있으면:
- 4 페르소나 시점 (신규/활성/다국적/모바일) 으로 핵심 페이지 5개 quick walk
- 각 페이지마다 **두 렌즈**로 본다:
  - **기능 렌즈**: "이 셀러가 다음에 무엇을 원할까" 1-2가지 hypothesis
  - **디자인 렌즈**: 시각 완성도·일관성(색/간격/타이포 토큰 준수)·정보 위계·빈/로딩/에러 상태·마이크로인터랙션·모바일 레이아웃·접근성. design-system.md 기준에서 벗어난 곳 또는 시스템을 한 단계 끌어올릴 곳.
- 가능하면 gstack `/browse` 로 스크린샷을 떠서 근거로 첨부 (디자인 제안은 시각 증거가 설득력이 큼).

dev 안 켜져 있으면 정적 코드 분석으로 대체 (컴포넌트의 className·레이아웃·상태 분기 점검).

## 3. 아이디어 3-5개 brainstorm

**믹스 규칙**: 매 회차 최소 1개는 아래 "디자인·UX" 에서, 나머지는 기능 카테고리에서.
가능하면 기능 3 + 디자인 1~2 비율. 디자인 제안이 0개인 회차가 없도록 한다.

### 디자인·UX (사용 경험 / 시각 완성도) — 매 회차 1개 이상 필수
- **일관성**: 색·간격·타이포·shadow·radius 가 design-system.md 토큰에서 벗어난 화면 통일
- **정보 위계**: 한 화면에서 가장 중요한 액션/숫자가 시각적으로 먼저 읽히는가 (대시보드·주문 상세 등)
- **상태 디자인**: 빈 상태(empty)·로딩(skeleton)·에러 화면의 안내·CTA 완성도
- **마이크로인터랙션**: hover/focus/transition·토스트·낙관적 업데이트·진행 표시
- **모바일**: 셀러가 폰으로 보는 핵심 플로우(주문 확인·매칭·알림)의 터치 타겟·레이아웃·가독성
- **접근성**: 대비비(WCAG AA)·focus ring·aria 라벨·키보드 내비
- **데이터 시각화**: 마진·정산·ETA·분석을 더 직관적으로 보여줄 차트/배지/색 코드
- **온보딩·delight**: 첫인상·빈 대시보드 가이드·완료 축하 등 정서적 완성도
- 디자인 시스템 자체 개선(토큰 추가/정리, 컴포넌트 변형 표준화)도 포함

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

제목 prefix 로 유형을 구분한다:
- 기능 제안 → `[idea/feature] <한 줄>`, label 에 `feature`
- 디자인·UX 제안 → `[idea/design] <한 줄>`, label 에 `design`

```bash
node scripts/agent/decision-needed.mjs \
  --title "[idea/design] <한 줄 — 셀러가 얻는 가치>" \
  --body "$(cat <<'BODY'
## 유형
기능 / 디자인·UX  (해당하는 것 하나)

## 배경
오늘 사이트 둘러보면서 발견한 기회.

## 셀러 입장에서 무엇이 달라지나
- 1줄
- 1줄

## (디자인 제안인 경우) 현재 vs 제안
- 현재: <어떤 화면이 어떻게 보이는가 — 일관성/위계/상태 문제>
- 제안: <design-system.md 기준 어떻게 바꾸나 — 토큰·레이아웃·상태>
- 시각 증거: <스크린샷 첨부 또는 file:line 근거>

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
  --labels "agent-idea,brainstorm,priority-low,design" \
  --waiting-for-key "idea-<spec-key>"
```

label 은 반드시 `agent-idea` 추가 (decision-needed 와 구분).
유형에 맞춰 `feature` 또는 `design` label 을 함께 단다 — 사용자가 모바일에서 필터링하기 쉽게.

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
