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

## ⭐ Phase 0 — 슈퍼 어드민 셀러 health 가시화 (cross-repo)

목표: 어드민이 모바일로 5초 안에 "모든 셀러 상태 / 누가 막혔나" 답.

### seller repo 측 작업 (이 repo agent 가 처리)

- [x] **#PH0-1 b2b_seller_health_snapshot 테이블 + 인덱스 + RLS**
  - estimated: 45m
  - prereq: 없음
  - decision_required: false
  - DDL: account_id+snapshot_date PK, 23 컬럼 (verification, plan, orders, sales, has_extension, products, receipts_7d, matched_pct, margin_failed, issue_flags jsonb, health_score)
  - `supabase/b2b_seller_health_snapshot.sql` 작성 + Supabase MCP apply_migration
  - 완료: 2026-05-27

- [x] **#PH0-2 health snapshot 계산 SQL function + pg_cron 등록**
  - estimated: 1h
  - prereq: #PH0-1
  - decision_required: false
  - `b2b_compute_seller_health_snapshot(p_date date)` SECURITY DEFINER 함수
  - 모든 active b2b_accounts loop, metric upsert
  - pg_cron `b2b_seller_health_snapshot_daily` KST 04:00 (UTC 19:00) 등록
  - 1회 backfill (오늘 날짜) 실행 → 2 accounts upsert, health_score 55/65
  - 완료: 2026-05-27

- [x] **#PH0-3 seller repo 측 dashboard 미니카드 — 본인 health score**
  - estimated: 30m
  - prereq: #PH0-1, #PH0-2 (snapshot row 있어야)
  - decision_required: false
  - `/dashboard` 우측에 본인 health score + 부족한 항목 hint 1개 미니카드
  - 셀러 본인이 어드민이 보는 metric 을 일부 미리 보게 함 (transparency)
  - 완료: 2026-05-27 commit a9bde03

### main repo 측 작업 (handoff issue 로 위임)

- [x] **#PH0-4 [handoff] main repo `/admin/b2b/health` 페이지 신규** _(handoff: jimpass-agent-platform#3, 2026-05-27)_
  - estimated: 5m (이 repo 측: issue 생성만)
  - prereq: #PH0-1 완료 (스키마 있어야 spec body 정확)
  - decision_required: false
  - 동작: `handoff-to-repo.mjs --to-repo anteam7/jimpass-agent-platform --spec-key phase0-admin-health-page --title "[from-seller] /admin/b2b/health 신규" --body "..." --labels "agent-handoff-from-seller,phase-0"`
  - body 에 포함: 테이블 스키마 / 4 KPI 카드 / row table / 필터 / 모바일 우선
  - main repo agent 처리 대기 (issue close 되면 PH0-5 진행)

- [ ] **#PH0-5 [handoff] main repo `/admin/b2b/health/[account_id]` detail 모달/페이지**
  - estimated: 5m (handoff issue 생성)
  - prereq: #PH0-4 issue 생성 후 (같은 main agent 가 후속 처리)
  - decision_required: false
  - 셀러 단건 클릭 시: 30일 trend chart, 이슈 카테고리 칩, 정지/plan 변경 액션

- [ ] **#PH0-6 [handoff] main repo `/admin/dashboard` 에 셀러 KPI 4 카드**
  - estimated: 5m
  - prereq: #PH0-4 완료 또는 동시
  - decision_required: false
  - 어드민 메인 페이지에 "B2B 셀러" 섹션 — 가입 총, 활성, 위험, 우수 4 카드 (서버 컴포넌트로 b2b_seller_health_snapshot 의 오늘 row 집계)

---

## P1 — 자율 진행 가능 (우선순위 순)

### 어제 QA 보류 6건 (small wins)

- [x] **#1 환율 배너 "마지막 성공 시각" 표시 (M-4)** — `/dashboard` 환율 배너에 `fetchedAt` 노출 + fallback 사용 중일 때 amber 배지. 환율 API 응답에 fetchedAt 이 이미 있음. UI 만 추가.
  - estimated: 30m
  - prereq: 없음
  - decision_required: false
  - 완료: 2026-05-27 commit 97c9127

- [x] **#2 /settings "준비 중" 4개 카드 disabled 처리 (L-4)** — API 키 관리·팀원 초대·웹훅·구글 시트 카드를 `opacity-50 cursor-not-allowed` + tooltip "L4 인증 후 사용 가능"
  - estimated: 30m
  - prereq: 없음
  - decision_required: false
  - 완료: 2026-05-27

- [x] **#3 /notifications 페이지네이션 (L-8)** — 최근 100건 → cursor 기반 50/page
  - estimated: 45m
  - prereq: 없음
  - decision_required: false
  - 완료: 2026-05-27 commit 47095a6

- [x] **#4 /imports navigation 정리 (L-5)** — empty state 의 "주문 매칭관리 통합 뷰" 화살표 link 가 자명하게
  - estimated: 20m
  - prereq: 없음
  - decision_required: false
  - 완료: 2026-05-27 commit ce8b900

- [x] **#5 /orders row click highlight + scroll position (L-7)** — sessionStorage 로 마지막 클릭 row 추적, 돌아오면 highlight + scroll
  - estimated: 1h
  - prereq: 없음
  - decision_required: false
  - 완료: 2026-05-27 commit 9fdcb9a

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

### Brainstorm approved (2026-05-27)

- [ ] **#idea-3 환불 관리 (b2b_refunds + /refunds 페이지)** _(brainstorm approved 2026-05-27)_
  - estimated: 4-5h
  - prereq: 없음
  - decision_required: false
  - source: github issue#3
  - DB 변경: b2b_refunds (order_id, reason, status, refund_amount_krw, requested_at, settled_at) + b2b_orders.status enum 'refund_requested' 추가

- [ ] **#idea-4 다중 결제 카드 관리 (b2b_payment_cards)** _(brainstorm approved 2026-05-27)_
  - estimated: 2-3h
  - prereq: 없음
  - decision_required: false
  - source: github issue#4
  - DB 변경: b2b_payment_cards 테이블 + b2b_order_items.payment_card_id 추가
  - UI: /settings/cards + dashboard 카드별 매입 합계 미니카드

- [ ] **#idea-5 주문 ETA 예상 + /eta 캘린더** _(brainstorm approved 2026-05-27)_
  - estimated: 3-4h
  - prereq: 없음
  - decision_required: false
  - source: github issue#5
  - DB 변경: b2b_forwarders.avg_transit_days_to_kr 컬럼 추가 (사용자가 점진 보강)
  - UI: /eta 페이지 + dashboard 미니카드 + ICS export endpoint
  - 참조: 사용자가 issue#5 댓글에 33 배대지 양식 xlsx 5개 (japan_boat/japan_air/china_air/england/usa_air) 첨부 — 양식 변환 작업 시 함께 활용

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

- P1 자율 가능: **15개** (#12 + idea-3,4,5 추가, #2 완료)
- P2 사용자 액션 대기: **4개**
- P3 미래: **7개**
- 예상 자율 진행 시간: P1 합계 ~10시간 (회차당 30분~1시간씩 약 15회차)

---

## 종료 조건

P1 모두 `[x]` → 다음 fire 시 큐 비었음 감지 → `chore(queue): P1 소진` commit 후 idle.
사용자가 새 항목 추가하면 다음 fire 부터 다시 작동.
