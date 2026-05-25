# 자동 진행 큐 (24h agent cron)

마지막 갱신: 2026-05-25 (v2 — STOP&ASK 통합)
참조: [`agent-decision-rules.md`](agent-decision-rules.md) 매 fire 시 1회 read 필수

cron 이 매 회차 fire → 첫 P1 `pending` 항목 1개 처리 → commit + push + `b2b_auto_runs` row → `[x]` 마킹.
P0 는 사용자 결정 대기 (issue 답신 받기 전까지 skip).
모두 done 이면 cron idle (큐 추가될 때까지).

---

## 진행 규칙 (cron prompt 가 따라야 할 표준)

1. **시작 시 reference**: `agent-decision-rules.md` 1회 read
2. 큐의 P0 항목 중 `waiting_for: issue#<n>` 가 있으면 → `node scripts/agent/check-decision-reply.mjs --issue <n>` 호출 → decision 따라 진행 또는 skip
3. P1 `[ ]` (pending) 첫 항목 pick
4. 작업 시작 — 도중 STOP&ASK 트리거 발견 시:
   - `node scripts/agent/decision-needed.mjs --title ... --body ... --labels ... --waiting-for-key ...` 실행
   - 큐 항목을 `status: waiting → P0` 로 이동 + `waiting_for: issue#<번호>` 기록
   - 큐 다음 P1 항목으로
5. 작업 완료 시:
   - `npm run build` 통과 확인
   - commit: `[AGENT-AUTO] <category>: <짧은 설명>` 형식
   - push origin main
   - 큐에서 `[x]` 마킹 + 별도 commit `chore(queue): #N 완료`
   - `b2b_auto_runs` row insert (Supabase MCP `execute_sql`)
6. 큐 비었으면 `chore(queue): 비었음 — idle` commit 후 종료

작업 중 새 이슈 발견 시: P2 카테고리로 큐 끝에 추가.

---

## P0 — 사용자 결정 대기 (issue 답신 받기 전까지 skip)

(현재 없음)

---

## P1 — 자율 진행 가능 (우선순위 순)

### 어제 QA 보류 6건 (small wins)

- [ ] **#1 환율 배너 "마지막 성공 시각" 표시 (M-4)** — `/dashboard` 환율 배너에 `fetchedAt` 노출 + fallback 사용 중일 때 amber 배지. 환율 API 응답에 fetchedAt 이 이미 있음. UI 만 추가.
  - estimated: 30m
  - prereq: 없음
  - decision_required: false

- [ ] **#2 /settings "준비 중" 4개 카드 disabled 처리 (L-4)** — API 키 관리·팀원 초대·웹훅·구글 시트 카드를 `opacity-50 cursor-not-allowed` + tooltip "L4 인증 후 사용 가능"
  - estimated: 30m
  - prereq: 없음
  - decision_required: false

- [ ] **#3 /notifications 페이지네이션 (L-8)** — 최근 100건 → cursor 기반 50/page
  - estimated: 45m
  - prereq: 없음
  - decision_required: false

- [ ] **#4 /imports navigation 정리 (L-5)** — empty state 의 "주문 매칭관리 통합 뷰" 화살표 link 가 자명하게
  - estimated: 20m
  - prereq: 없음
  - decision_required: false

- [ ] **#5 /orders row click highlight + scroll position (L-7)** — sessionStorage 로 마지막 클릭 row 추적, 돌아오면 highlight + scroll
  - estimated: 1h
  - prereq: 없음
  - decision_required: false

- [ ] **#6 admin client `any` 캐스팅 제거 (G1 후속)** — `types/supabase.ts` 활용해서 점진. 한 회차에 한 모듈씩 (orders, products, settings ...).
  - estimated: 1h × 6 회차
  - prereq: 없음
  - decision_required: false

### next-steps.md 4순위 기술 부채

- [ ] **#7 paste 한글 → enum reverse lookup 확장 (MK1 후속)** — `/orders/bulk` paste 시 한국어 마켓·상태·통화 값 들어와도 영문 enum 으로 변환
  - estimated: 1h
  - prereq: 없음
  - decision_required: false

- [ ] **#8 `/api/announcements/active` graceful 제거 (cron-4 후속)** — b2b_announcements 테이블 있고 active row 있으면 정상 반환. graceful fallback 한 줄 제거 + 명시 에러
  - estimated: 20m
  - prereq: 없음
  - decision_required: false

- [ ] **#9 B3 첫 로그인 onboarding modal** — 가입 후 첫 /dashboard 진입 시 1회 모달. localStorage 로 dismiss 추적.
  - estimated: 1.5h
  - prereq: 없음
  - decision_required: false (단 디자인 컨셉 결정 필요할 수 있어 사전 sketch 후 진행)

### 자체 점검·품질 (skill 활용)

- [ ] **#10 매주 월요일 `/qa` 자동 실행** — 발견 critical/high 자동 fix, medium 이하는 P2 큐에 추가
  - estimated: 30m setup + 1h 실행
  - prereq: 없음
  - decision_required: false (단 fix 가 STOP&ASK 범위면 issue 생성)
  - schedule: weekly Mon 03:00 KST

- [ ] **#11 매주 `/security-review` 자동 실행** — 새로 추가된 API route / 마이그레이션 위주 점검
  - schedule: weekly Wed 03:00 KST

### 작은 자동화

- [ ] **#12 cron 실행 이력 dashboard 카드** — `/dashboard` 우측에 "최근 agent 활동" 3건 미니 카드 (시드 후)
  - estimated: 40m
  - prereq: b2b_auto_runs 에 row 1+ (cron 시작 후 자연 발생)
  - decision_required: false

---

## P2 — 도메인·운영 (사용자 액션 필요 — agent 가 알림만)

- [ ] **#A `seller.jimscanner.co.kr` Vercel 도메인 매핑** — 사용자가 DNS CNAME 등록 + Vercel 측 도메인 추가. agent 는 30일 뒤에도 안 됐으면 reminder issue 생성.
- [ ] **#B Resend 가입 + RESEND_API_KEY 발급** — 이메일 알림 채널 추가용. STOP&ASK 후 사용자 confirm 시 agent 가 가입 시도.
- [ ] **#C NTS_BUSINESS_API_KEY 발급 (data.go.kr)** — signup step-5 진위확인 활성. STOP&ASK + 사용자 confirm.
- [ ] **#D main repo `bfa487f` push + types/supabase.ts sync** — 사용자가 main repo 에서 직접 push (agent 가 main repo 접근 X)

---

## P3 — 향후 큰 작업 (대기열, 아직 spec 미정)

- M2 다중 사용자·권한 분리 (DB·RLS·UI 큰 변경)
- 마켓 API 자동 import (쿠팡·스마트스토어)
- 라쿠텐·야후·메루카리 확장 스크래퍼 (사이트별 selector — 사용자가 1페이지 보여줘야)
- 17track 양방향 API
- 카카오 알림톡
- 자사몰 API 연동
- 도매 워크플로우 (P8)

---

## 큐 통계

- P1 자율 가능: **12개**
- P2 사용자 액션 대기: **4개**
- P3 미래: **7개**
- 예상 자율 진행 시간: P1 합계 ~10시간 (회차당 30분~1시간씩 약 15회차)

---

## 종료 조건

P1 모두 `[x]` → 다음 fire 시 큐 비었음 감지 → `chore(queue): P1 소진` commit 후 idle.
사용자가 새 항목 추가하면 다음 fire 부터 다시 작동.
