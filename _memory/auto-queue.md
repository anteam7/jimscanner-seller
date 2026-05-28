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

- [ ] **#P0-1 Supabase 보안 advisor ERROR/Auth 설정 결정** _(self-audit 2026-05-28)_
  - waiting_for: issue#7
  - 항목: Postgres 업그레이드 / leaked password protection / MFA options / 비 b2b 테이블 RLS off / forwarder_min_rates security_definer_view
  - 사용자 답변 받으면 항목별 AUTO-RUN 또는 handoff 분기

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

- [x] **#6 admin client `any` 캐스팅 제거 (G1 후속)** — `types/supabase.ts` 활용해서 점진. 한 회차에 한 모듈씩 (orders, products, settings ...).
  - estimated: 1h × 6 회차
  - prereq: 없음
  - decision_required: false
  - progress: orders (commit 8ddd2f5), products (commit 46c6b91), settings 5/6 파일, imports (commit 3394954), signup (commit 23909d3), billing (commit 8f5c2eb), lib/b2b (commit d7b18eb).
  - 완료: 2026-05-27 commit d7b18eb (마지막 모듈)
  - note: `src/app/api/settings/compliance/route.ts` 는 DB 에 없는 `b2b_withdrawal_notices` 테이블 + `withdrawal_notice_*` 컬럼 참조하여 cast 유지. 별도 fix 필요 (DB 마이그레이션 또는 코드 제거). `src/lib/b2b/forwarder-export.ts` 의 `buf as any` 는 exceljs 구버전 Buffer 타입 호환을 위한 의도적 캐스트 (유지).
  - bonus: imports 회차에서 `b2b_order_items.qty` ↔ 실제 `quantity` silent bug 발견 (postgrest alias `qty:quantity`). billing 회차에서 `b2b_subscriptions.discount_override_pct` 컬럼 DB 미적용 silent bug 발견·migration apply.

### next-steps.md 4순위 기술 부채

- [x] **#7 paste 한글 → enum reverse lookup 확장 (MK1 후속)** — `/orders/bulk` paste 시 한국어 마켓·상태·통화 값 들어와도 영문 enum 으로 변환
  - estimated: 1h
  - prereq: 없음
  - decision_required: false
  - 완료: 2026-05-28 commit a1d389b
  - 추가된 alias: marketplace 13×2-4 / supplier_site 24×3-4 / currency 7×한·영변형 / forwarder_country 7×변형. SELECT_VALUE_ALIASES 통해 reverseLookup 확장. '달러' → USD, 'Amazon US' → amazon_us 등 자동 변환.

- [x] **#8 `/api/announcements/active` graceful 제거 (cron-4 후속)** — b2b_announcements 테이블 있고 active row 있으면 정상 반환. graceful fallback 한 줄 제거 + 명시 에러
  - estimated: 20m
  - prereq: 없음
  - decision_required: false
  - 완료: 2026-05-28 commit 1f8cd22
  - 변경: 42P01 silent fallback 제거 + `supabase as any` 캐스팅 제거 (types/supabase.ts 타입 활용)

- [x] **#9 B3 첫 로그인 onboarding modal** — 가입 후 첫 /dashboard 진입 시 1회 모달. localStorage 로 dismiss 추적.
  - estimated: 1.5h
  - prereq: 없음
  - decision_required: false (단 디자인 컨셉 결정 필요할 수 있어 사전 sketch 후 진행)
  - 완료: 2026-05-28 commit dcbcb2f
  - 구현: `src/components/b2b/OnboardingModal.tsx` (client) + `(app)/dashboard/page.tsx` 인사말 위 mount. 신규 셀러 조건 (monthOrderCount=0 && skuCount=0) + localStorage key `jimscanner_b2b_onboarding_v1_dismissed` 미설정 시 표시. 그라데이션 헤더 + 3 핵심 셋업 (확장/배대지/첫주문) 링크. ESC·백드롭·X·나중에 4가지 dismiss path.

### 자체 점검·품질 (skill 활용)

- [x] **#10 매주 월요일 `/qa` 자동 실행** — 발견 critical/high 자동 fix, medium 이하는 P2 큐에 추가
  - estimated: 30m setup + 1h 실행
  - prereq: 없음
  - decision_required: false (단 fix 가 STOP&ASK 범위면 issue 생성)
  - schedule: weekly Mon 03:00 KST
  - 완료: 2026-05-28
  - setup: `scripts/agent/weekly-qa-prompt.md` 작성 + README.md 에 파일 구조 갱신. Windows Task Scheduler 등록은 사용자가 prompt 끝의 PowerShell 명령으로 수행. 실제 주간 실행은 다음 월요일 KST 03:00 첫 fire.

- [x] **#11 매주 `/security-review` 자동 실행** — 새로 추가된 API route / 마이그레이션 위주 점검
  - schedule: weekly Wed 03:00 KST
  - 완료: 2026-05-28
  - setup: `scripts/agent/weekly-security-review-prompt.md` 작성 + README.md 파일 구조표·prompt 패턴 갱신. agent_type='review', mode='review' 로 b2b_auto_runs 기록. scope: 신규/수정 API route 권한 가드 + SQL 마이그레이션 RLS·search_path·EXECUTE grant + Supabase advisor 재확인 + secrets diff 스캔. Windows Task Scheduler 등록은 사용자가 prompt 끝 PowerShell 명령으로 수행. 첫 fire 는 다음 수요일 KST 03:00.

### 작은 자동화

- [x] **#12 cron 실행 이력 dashboard 카드** — `/dashboard` 최하단에 "최근 시스템 활동" 3건 미니 카드 (b2b_auto_runs 직접 read via admin client)
  - estimated: 40m
  - prereq: b2b_auto_runs 에 row 1+ (cron 시작 후 자연 발생)
  - decision_required: false
  - 완료: 2026-05-28 commit cb8dfbe
  - 구현: src/app/(app)/dashboard/page.tsx — admin client 로 b2b_auto_runs ORDER BY created_at DESC LIMIT 3 fetch, mode 배지 (구현/점검/발견), failed 시 rose 배지, change_summary 140자 truncate. runs 0건이면 카드 hide.

### Audit 발견 2026-05-28 (self-audit cycle)

- [x] **#auto-A lint: ESLint config FlatCompat circular structure fix** _(audit 발견 2026-05-28)_
  - estimated: 30m
  - prereq: 없음
  - decision_required: false
  - finding: `npm run lint` 가 `TypeError: Converting circular structure to JSON` 으로 죽음 — `eslint.config.mjs` 가 FlatCompat 으로 `next/core-web-vitals`, `next/typescript` extend 시 react plugin 순환 참조. ESLint 9.39 호환 형식으로 마이그레이션 필요 (`@next/eslint-plugin-next` 직접 import).
  - severity: high
  - 완료: 2026-05-28
  - fix: `eslint-config-next` v16.1.6 가 이미 flat config exports 제공 (`./core-web-vitals`, `./typescript`) — FlatCompat 제거하고 직접 import + spread. 추가로 `.next/**`, `node_modules/**` 등 ignores 명시.
  - bonus: lint 가 다시 돌면서 33 errors / 19 warnings 의 pre-existing 이슈 노출 → `#auto-A-followup` 으로 별도 큐 항목 추가

- [x] **#auto-B db: b2b 트리거/함수 search_path 명시 (function_search_path_mutable)** _(audit 발견 2026-05-28)_
  - estimated: 30m
  - prereq: 없음
  - decision_required: false
  - finding: Supabase advisor — `tg_b2b_touch_updated_at`, `tg_b2b_form_templates_set_updated_at`, `tg_b2b_products_set_updated_at` 등 b2b 관련 함수에 `SET search_path = public, pg_temp` 누락. SQL injection 위험.
  - severity: medium
  - 완료: 2026-05-28
  - fix: Supabase MCP apply_migration `b2b_trigger_functions_set_search_path` — `ALTER FUNCTION ... SET search_path = public, pg_temp` 3건. 원본 정의 (b2b_schema.sql, b2b_form_templates.sql, b2b_products.sql) 에도 `SET search_path = public, pg_temp` inline 추가하여 차후 재적용 시 동기 유지. 기록 SQL: `supabase/b2b_2026_05_28_trigger_search_path.sql`.
  - note: b2b SECURITY DEFINER 함수 4건 (`b2b_compute_seller_health_snapshot`, `b2b_marketwide_supplier_stats`, `b2b_reset_monthly_quotas`, `b2b_auto_provision_free_subscription`) 은 이미 `search_path=public` 또는 `public, pg_temp` 가 설정되어 advisor 에서 미플래그. EXECUTE 권한은 `#auto-C` 에서 별도 처리.

- [x] **#auto-C db: b2b SECURITY DEFINER 함수 anon/authenticated EXECUTE REVOKE** _(audit 발견 2026-05-28)_
  - estimated: 20m
  - prereq: 없음
  - decision_required: false
  - finding: Supabase advisor — `b2b_auto_provision_free_subscription`, `b2b_compute_seller_health_snapshot`, `b2b_marketwide_supplier_stats`, `b2b_reset_monthly_quotas` 가 anon/authenticated 에서 EXECUTE 가능. 의도된 호출자는 service_role / pg_cron 만.
  - severity: high
  - 완료: 2026-05-28
  - fix: Supabase MCP `apply_migration b2b_security_definer_revoke_execute` — 4 함수 모두 PUBLIC/anon REVOKE. `b2b_auto_provision_free_subscription` (트리거 전용), `b2b_compute_seller_health_snapshot` (pg_cron), `b2b_reset_monthly_quotas` (pg_cron) 는 authenticated 도 REVOKE → 결과 ACL `postgres / service_role` 만. `b2b_marketwide_supplier_stats` 는 /analytics 페이지가 세션 .rpc() 직접 호출하므로 authenticated 유지. 원본 SQL (`b2b_accounts_auto_provision_free_subscription.sql`, `b2b_compute_seller_health_snapshot.sql`, `b2b_reset_monthly_quotas.sql`, `b2b_marketwide_supplier_stats_rpc.sql`) 에도 REVOKE 블록 추가하여 재적용 시 동기 유지. 기록 SQL: `supabase/b2b_2026_05_28_revoke_security_definer_execute.sql`.

- [x] **#auto-D db: b2b_auto_runs RLS policy 추가 (admin-only)** _(audit 발견 2026-05-28)_
  - estimated: 15m
  - prereq: 없음
  - decision_required: false
  - finding: RLS enabled 인데 policy 없음 → service_role 외 모두 0 row. admin SELECT policy 추가 + service_role 은 RLS bypass 로 INSERT 가능 유지.
  - severity: medium
  - 완료: 2026-05-28 commit b92ce7b
  - fix: Supabase MCP `apply_migration b2b_auto_runs_admin_select_policy` — `authenticated` role 중 JWT email 이 admin (anseunghyok@gmail.com) 인 경우만 SELECT. service_role 은 BYPASSRLS 권한으로 cron INSERT/UPDATE 그대로 유지. 원본 `supabase/b2b_auto_runs.sql` 에도 정책 inline 동기. 기록 SQL: `supabase/b2b_2026_05_28_auto_runs_admin_select_policy.sql`. 적용 후 advisor `rls_enabled_no_policy` 가 `b2b_auto_runs` 플래그 해제됨 확인. 추가 admin 필요 시 OR 조건 확장 또는 `b2b_admins(email)` 테이블 도입 권장.

- [x] **#auto-E db: b2b 테이블 RLS `auth.uid()` initplan 최적화 (50건 WARN)** _(audit 발견 2026-05-28)_
  - estimated: 1h
  - prereq: 없음
  - decision_required: false
  - finding: Supabase performance advisor — b2b_accounts, b2b_orders, b2b_order_items 등 RLS policy 에서 `auth.uid()` 가 row 별 재평가. `(select auth.uid())` 패턴으로 교체하면 query plan 1회 evaluation. 행 많아질수록 영향 큼.
  - severity: medium
  - 완료: 2026-05-28 commit c042073
  - fix: Supabase MCP `apply_migration b2b_rls_initplan_optimization` — 30개 b2b_* 테이블 51 policies 모두 DROP + 동일 의미·target role 유지 + qual/with_check 안의 `auth.uid()` / `auth.role()` / `auth.jwt()` 를 `(SELECT auth.x())` 로 wrap. 기록 SQL: `supabase/b2b_2026_05_28_rls_initplan_optimization.sql`. 적용 후 advisor `auth_rls_initplan` 재확인 결과 b2b_* 0건 (51 → 0). 행 수 늘수록 RLS overhead 감소 효과.

- [x] **#auto-F db: b2b_form_template_columns multiple_permissive_policies 통합** _(audit 발견 2026-05-28)_
  - estimated: 20m
  - prereq: 없음
  - decision_required: false
  - finding: Supabase advisor — 같은 role/cmd 에 permissive policy 5건 (anon/authenticated/authenticator/dashboard_user/supabase_privileged_role) for SELECT. `template_columns_modify` (FOR ALL) + `template_columns_select` (FOR SELECT) 가 SELECT 시 동시 평가.
  - severity: low
  - 완료: 2026-05-28 commit 334760c
  - fix: Supabase MCP `apply_migration b2b_form_template_columns_split_modify_policy` — `template_columns_modify` (FOR ALL) DROP 후 INSERT/UPDATE/DELETE 3개 정책으로 split. SELECT 는 `template_columns_select` 한 곳에서만 평가. 의미·target role (public) 보존, auth.uid() initplan 패턴 (SELECT auth.uid()) 유지. 원본 `supabase/b2b_form_templates.sql` 과 `b2b_2026_05_28_rls_initplan_optimization.sql` 도 동기. 기록 SQL: `supabase/b2b_2026_05_28_form_template_columns_split_modify.sql`. 적용 후 같은 role/cmd 조합당 정책 수 = 1 확인.

- [ ] **#auto-G db: 미사용 인덱스 정리 검토 (b2b_*)** _(audit 발견 2026-05-28)_
  - estimated: 30m
  - prereq: 없음
  - decision_required: false
  - finding: Supabase advisor — b2b_order_items / b2b_orders / b2b_seller_health_snapshot 에 unused_index INFO. write 비용 감소 효과 있음 — 단 신규 테이블이라 사용 통계 부족 가능, 신중히 (3개월 운영 후 재검토 권장).
  - severity: low

- [ ] **#auto-A-followup lint: 0 errors / 16 warnings 남음 (phase 1, 2, 3, 4 완료, 5/N)** _(#auto-A 후속 2026-05-28)_
  - estimated: 30m 남음
  - prereq: #auto-A 완료
  - decision_required: false
  - finding: ESLint 다시 동작 후 노출된 pre-existing 이슈들. errors 전건 청소 완료. 남은 warnings 는 모두 unused-vars / unused eslint-disable 카테고리.
  - 권장 접근: phase 5 에서 unused-vars 일괄 청소 (한 회차 30분)
  - severity: medium → low (errors 0 도달)
  - progress:
    - phase 1 완료 (2026-05-28 commit de61094): react-hooks/immutability 4건 + server-component Date.now() purity 2건. 52 → 47 problems (33 errors → 29).
    - phase 2 (1/2) 완료 (2026-05-28 commit 6c3249b): set-state-in-effect 5건. 47 → 41 problems (29 → 24 errors).
    - phase 2 (2/2) 완료 (2026-05-28 commit 5b554c9): set-state-in-effect 9건 (6 eslint-disable + 3 render-time setState 리팩토링). 41 → 32 problems (24 → 15 errors).
    - phase 3 완료 (2026-05-28 commit bd87652): set-state-in-effect 6건. 32 → 26 problems (15 → 9 errors).
    - phase 4 완료 (2026-05-28): no-explicit-any 6건 + no-html-link-for-pages 1건 + no-unescaped-entities 2건. pricing/page.tsx 는 supabase 타입 직접 사용 (cast 제거), api/auth/callback·password 는 createAdminClient typed 활용, api/settings/compliance 는 미적용 컬럼 참조라 cast 유지 + 명시 eslint-disable, billing-lifecycle (Deno edge fn) 은 db param 을 `ReturnType<typeof createClient>` 로 타입. settings/account/delete 는 next/Link, settings/extension 은 `&ldquo;/&rdquo;` HTML entity. 26 → 16 problems (9 → 0 errors).
  - 남은 phase:
    - phase 5: unused-vars 14건 warning 청소 (extension JS 2건, analytics/dashboard/orders/settings/compliance/announcements/signup step-2~4 등) + bulk header_aliases / select_value_aliases exhaustive-deps 2건 검토.

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

### Brainstorm approved (2026-05-28)

- [ ] **#idea-8 운송장 자동 트래킹 hub (17track 1-click + status 자동 전이)** _(brainstorm approved 2026-05-28)_
  - estimated: 1.5-2h
  - prereq: 없음
  - decision_required: false
  - source: github issue#8
  - DB 변경: b2b_order_items 에 tracking_number_overseas / tracked_carrier / tracking_updated_at 3 컬럼 + trigger (paid → in_transit)
  - UI: /orders 라인별 운송장 입력 + 17track 외부 link 버튼 + bulk paste

- [ ] **#idea-9 dashboard 7일 매출 sparkline + WoW 비교** _(brainstorm approved 2026-05-28)_
  - estimated: 40-50m
  - prereq: 없음
  - decision_required: false
  - source: github issue#9
  - DB 변경: 없음
  - UI: 4 통계 카드에 인라인 SVG sparkline + 전주 대비 % 칩

- [ ] **#idea-10 자주 사는 매입 SKU 즐겨찾기 / 최근 매입 quick-pick** _(brainstorm approved 2026-05-28)_
  - estimated: 2-2.5h
  - prereq: 없음
  - decision_required: false
  - source: github issue#10
  - DB 변경: b2b_products.is_favorite + last_purchased_at 추가
  - UI: /orders/new 에 SKUQuickPick 드롭다운, GET /api/products/quick-pick

- [ ] **#idea-11 통관 가이드 inline hint — 주문 생성 시 카테고리 자동 매칭** _(brainstorm approved 2026-05-28)_
  - estimated: 1.5h
  - prereq: 없음
  - decision_required: false
  - source: github issue#11
  - DB 변경: b2b_order_items.customs_category 컬럼 (있는지 확인 후 없으면 추가)
  - UI: /orders/new + /orders/bulk 라인 입력에 CustomsCategoryHint inline 배너 + keyword 사전 (한·영·일 ~150)

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

- P1 자율 가능: **26개** (#7~12, #auto-A~E 완료. audit 2026-05-28 +7건: #auto-A~G. #auto-A-followup +1건. brainstorm approved 2026-05-28 +4건: #idea-8~11)
- P0 결정 대기: **1개** (issue#7)
- P2 사용자 액션 대기: **4개**
- P3 미래: **7개**
- 예상 자율 진행 시간: P1 합계 ~10시간 (회차당 30분~1시간씩 약 15회차)

---

## 종료 조건

P1 모두 `[x]` → 다음 fire 시 큐 비었음 감지 → `chore(queue): P1 소진` commit 후 idle.
사용자가 새 항목 추가하면 다음 fire 부터 다시 작동.
