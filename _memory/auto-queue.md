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

- [~] **#P0-1 Supabase 보안 advisor ERROR/Auth 설정 결정** _(self-audit 2026-05-28)_
  - waiting_for: issue#7
  - 항목: Postgres 업그레이드 / leaked password protection / MFA options / 비 b2b 테이블 RLS off / forwarder_min_rates security_definer_view
  - **2026-05-30 (30회차) 사용자 최종 답신 수신**: item 1·3·4·5 = no (현 상태 유지) / **item 2 = 적용요청 (password min_length=10 + 특수문자 강제)**.
  - item 2 는 GoTrue Auth runtime config (SQL/migration 경로 없음, Management API PAT 미보유) → agent 가 MCP 툴로 적용 불가. issue#7 에 정확한 대시보드 단계 댓글 게시 후 사용자 토글 대기. item 1/3/4/5 는 "현 상태 유지" 로 종결 (영향 분석은 기존 댓글에 게시 완료).
  - 사용자 대시보드 토글 확인 시 issue close.

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
  - note: ~~`src/app/api/settings/compliance/route.ts` 는 DB 에 없는 `b2b_withdrawal_notices` 테이블 + `withdrawal_notice_*` 컬럼 참조하여 cast 유지. 별도 fix 필요~~ (2026-05-29 13회차 commit 7cc0840 해결 — 누락 스키마 적용 + 캐스트 3건 제거). `src/lib/b2b/forwarder-export.ts` 의 `buf as any` 는 exceljs 구버전 Buffer 타입 호환을 위한 의도적 캐스트 (유지).
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

- [x] **#auto-G db: 미사용 인덱스 정리 검토 (b2b_*)** _(audit 발견 2026-05-28)_
  - estimated: 30m
  - prereq: 없음
  - decision_required: false
  - finding: Supabase advisor — b2b_order_items / b2b_orders / b2b_seller_health_snapshot 에 unused_index INFO. write 비용 감소 효과 있음 — 단 신규 테이블이라 사용 통계 부족 가능, 신중히 (3개월 운영 후 재검토 권장).
  - severity: low
  - 완료: 2026-05-28 (drop 없이 기록만)
  - 결정: 2 active accounts / 행 10건 미만이라 옵티마이저가 seq scan 선택하는 정상 동작. 행 수 늘면 자연 활용 예상되어 이번 회차 drop 하지 않음. 재검토 기한 **2026-08-28**.
  - 기록 SQL: `supabase/b2b_2026_05_28_unused_index_review_snapshot.sql` (드롭 후보 12개 + 검증 쿼리 + 선정 기준 명시).

### Audit 발견 2026-05-29 (self-audit cycle)

- [x] **#auto-H db: b2b 외래키 11건 미인덱스 (defer to 2026-08-28)** _(audit 발견 2026-05-29)_
  - estimated: 20m (snapshot 기록만)
  - prereq: 없음
  - decision_required: false
  - finding: Supabase performance advisor 0001_unindexed_foreign_keys — 11건. 높은 활용 예상: b2b_refunds.order_item_id / b2b_shipments.{order_id,forwarder_id} / b2b_supplier_purchase_matches.order_item_id / b2b_supplier_purchases.matched_order_id. 낮은 활용 예상: b2b_account_terms_consent / b2b_announcements / b2b_audit_log / b2b_forwarder_mappings / b2b_products.default_forwarder_id / b2b_subscriptions.plan_id.
  - severity: low (행 수 적어 옵티마이저 seq scan 선택, 운영 부하 미관측)
  - 완료: 2026-05-29 (snapshot 기록만, 실제 인덱스 추가 없음)
  - 결정: #auto-G 와 동일 — 3개월 관찰 후 재검토 (**2026-08-28**). 그 때까지 행 수 늘면 자연 활용 시작, 활용 없으면 (a) low-volume 6건 무시 + (b) high-volume 5건 인덱스 추가 (b2b_refunds.order_item_id 부터).
  - 기록 SQL: `supabase/b2b_2026_05_29_unindexed_fk_snapshot.sql` (11 후보 + 검증 쿼리 + 분류 기준).
  - note: 보안 advisor WARN 1건 (b2b_marketwide_supplier_stats SECURITY DEFINER + authenticated EXECUTE) 은 #auto-C 결정에 따라 의도적 유지 (시장 집계 anonymized 데이터, /analytics 페이지 RPC 호출 필요).

- [x] **#auto-A-followup lint: 0 errors / 0 warnings 도달 (phase 1~5 완료)** _(#auto-A 후속 2026-05-28)_
  - estimated: 30m 남음
  - prereq: #auto-A 완료
  - decision_required: false
  - finding: ESLint 다시 동작 후 노출된 pre-existing 이슈들. errors·warnings 전건 청소 완료.
  - severity: medium → done
  - 완료: 2026-05-28
  - progress:
    - phase 1 완료 (2026-05-28 commit de61094): react-hooks/immutability 4건 + server-component Date.now() purity 2건. 52 → 47 problems (33 errors → 29).
    - phase 2 (1/2) 완료 (2026-05-28 commit 6c3249b): set-state-in-effect 5건. 47 → 41 problems (29 → 24 errors).
    - phase 2 (2/2) 완료 (2026-05-28 commit 5b554c9): set-state-in-effect 9건 (6 eslint-disable + 3 render-time setState 리팩토링). 41 → 32 problems (24 → 15 errors).
    - phase 3 완료 (2026-05-28 commit bd87652): set-state-in-effect 6건. 32 → 26 problems (15 → 9 errors).
    - phase 4 완료 (2026-05-28): no-explicit-any 6건 + no-html-link-for-pages 1건 + no-unescaped-entities 2건. 26 → 16 problems (9 → 0 errors).
    - phase 5 완료 (2026-05-28): unused-vars 14건 + exhaustive-deps 2건 청소. 16 → 0 problems (0 → 0 errors / 16 → 0 warnings).
      - dead code 제거: amazon-checkout currentCountry, generic-form-filler getPatternsModule, analytics marketByKey, dashboard OnboardingStep, orders/page StatusBadge·MarketplaceTag·formatKRW·formatDate·sumSale, settings/compliance Metadata import, signup step-2/3/4 Link imports.
      - bulk SELECT_VALUE_ALIASES·HEADER_ALIASES 를 모듈 스코프로 이동하여 exhaustive-deps 2건 해소 (재생성 비용도 절감).
      - eslint.config.mjs 에 `no-unused-vars` rule 명시 (argsIgnorePattern:^_ / ignoreRestSiblings:true) — `_tc` 같은 prefix 변수와 destructure rest 제외 패턴이 일관되게 통과.

### Brainstorm approved (2026-05-27)

- [x] **#idea-3a 환불 관리 Phase 1 — b2b_refunds DDL + RLS + status check 확장** _(brainstorm approved 2026-05-27)_
  - estimated: 45m
  - prereq: 없음
  - decision_required: false
  - source: github issue#3
  - 완료: 2026-05-28
  - 변경: Supabase MCP `apply_migration b2b_refunds_table` — 18 컬럼 (account_id/order_id/order_item_id, reason/reason_category, status/status_history, refund_amount_krw/refund_method, buyer_message/internal_notes, requested_at/approved_at/settled_at, audit), 3 인덱스 (account_date, order, status), `tg_b2b_refunds_touch` updated_at trigger, RLS `b2b_refunds tenant rw` (initplan 패턴 `(select auth.uid())`), `b2b_orders_status_check` 에 'refund_requested' 추가. 원본 SQL `supabase/b2b_refunds.sql`. `types/supabase.ts` 동기.
  - 후속: `#idea-3b` UI 페이지

- [x] **#idea-3b 환불 관리 Phase 2 — /refunds 페이지 + /orders 연결** _(brainstorm approved 2026-05-27, 2026-05-28 split)_
  - estimated: 3-4h
  - prereq: #idea-3a 완료
  - decision_required: false
  - source: github issue#3
  - 완료: 2026-05-28 commit f43497a
  - 구현:
    - `/refunds` 목록 페이지 (status 필터 칩 + 50건/페이지, 빈 상태 + 주문 목록 CTA)
    - `/refunds/new?order_id=…` 폼 (라인 선택, 사유 카테고리, 금액, 방법, 구매자 메시지, 내부 메모)
    - `/refunds/[id]` 상세 (status 이력 타임라인 + 액션 사이드바)
    - `POST /api/refunds` (소유권 검증 + b2b_orders.status `refund_requested` 전이)
    - `PATCH /api/refunds/[id]` (status 전이 + status_history 누적, settled→`refunded`, denied/cancelled 시 주문 `refund_requested`→`completed` 복귀)
    - `/orders/[id]` 사이드바에 환불 요청 등록 버튼 + STATUS_META `refund_requested` 라벨 추가
    - `SellerShell` 주문관리 sub-item 에 환불 관리 추가 + child path 도 그룹 활성화 (`childActive` 로직)
  - 후속 (소형): ~~대시보드 미니카드 (이달 환불 건수·금액)~~ (2026-05-29 commit 47542a4 완료 — RefundMiniCard: 신청/처리대기/정산완료 + 정산 환불액 KRW), ~~페이지네이션 cursor~~ (2026-05-29 commit d4b9878 완료 — requested_at lt() cursor + status 보존, 다음 50건/처음으로 링크)

- [x] **#idea-4 다중 결제 카드 관리 (b2b_payment_cards)** _(brainstorm approved 2026-05-27)_
  - estimated: 2-3h
  - prereq: 없음
  - decision_required: false
  - source: github issue#4
  - 완료: 2026-05-28 commit 0071ca3
  - 구현:
    - DB: b2b_payment_cards 테이블 (alias/brand/last4/color/credit_limit/billing_day 등) + b2b_order_items.payment_card_id FK. RLS initplan 패턴 + tg_b2b_payment_cards_touch trigger.
    - API: /api/payment-cards (GET, POST), /api/payment-cards/[id] (PATCH, DELETE soft), /api/orders/[id]/items/[itemId]/payment-card (라인 매핑).
    - UI: /settings/cards 페이지 + PaymentCardsManager 컴포넌트 (색상 6 프리셋, 보관·복귀·삭제). /settings 인덱스에 '재무·결제' 섹션 추가.
    - UI: /orders/[id] 매입 라인에 LinePaymentCardSelector 인라인 매핑 컴포넌트.
    - UI: /dashboard CardSpendCard — 이달 카드별 라인 수·통화별 매입 합계·KRW 합계.
  - 보안: PCI 회피 — 카드 번호 본번호/CVC/유효기간 저장 없음. 별칭·last4·결제일만 저장.
  - 후속 (소형): ~~/settings/cards 에 이달 카드별 매입 합계 표시 (현재 dashboard 만)~~, ~~card 한도 vs 사용량 경고 banner~~ (2026-05-29 commit fbaacfb 완료 — page 에서 카드별 이달 매입 KRW 합계 계산 (dashboard 와 동일 b2b_orders!inner 격리), PaymentCardsManager 행마다 이달 매입·라인수 + 한도 대비 사용률 progress bar (emerald<80/amber≥80/rose≥100), 한도 80%+ active 카드 상단 amber 경고 배너). → #idea-4 후속 전건 소진.

- [x] **#idea-5 주문 ETA 예상 + /eta 캘린더** _(brainstorm approved 2026-05-27)_
  - estimated: 3-4h
  - prereq: 없음
  - decision_required: false
  - source: github issue#5
  - 완료: 2026-05-28 commit 8e2effc
  - 구현:
    - DB: `b2b_forwarder_transit_defaults` 신규 테이블 (origin_country × method) + 22 국가 시드 (US/JP/CN/UK/DE/FR/IT/ES/AU/CA/HK/TW/SG/VN/TH/OTHER + JP boat/EMS, US/CN boat/express). RLS read authenticated/anon (글로벌 lookup), write service_role only. 트리거 search_path 명시. 원본 SQL `supabase/b2b_forwarder_transit_defaults.sql`.
    - 주의: `b2b_forwarders` 컬럼 추가 대신 별도 lookup 테이블 — 원본 `forwarders` 는 main repo 소유이며 ETA 는 국가·운송수단 기준으로도 충분히 정확.
    - `src/lib/b2b/eta.ts`: `computeOrderEta()` — forwarder_submitted_at 있으면 + transit_days, 없으면 order_date + 3(buffer) + transit_days. `classifyEtaBucket()` overdue/this_week/next_week/later (KST 기준).
    - `/eta` 페이지 (서버 컴포넌트): 4 KPI 카드 + 버킷별 details/summary 그룹 목록. 추정 라인엔 amber `추정` 배지. 국가 미설정엔 ⚠ 표시.
    - `/api/eta/ics` ICS endpoint: RFC 5545 VCALENDAR all-day event, 추정 라인엔 `CATEGORIES:추정`. /eta 페이지 헤더 다운로드 버튼.
    - 대시보드 `EtaMiniCard`: 지연 또는 이번주 있을 때만 표시. 카운트 2개 + 다음 3건 미리보기.
    - SellerShell 주문관리 sub-item 에 "도착 예정 (ETA)" 추가.
  - 후속 (소형): ~~forwarder_country UK/GB alias 통합~~ (2026-05-29 commit 7b83ab7 완료 — eta.ts normalizeOriginCountry: GB/England/USA 등 → 시드 코드, lookup·compute·ICS·페이지 라벨 일괄), ~~셀러별 transit 평균 override~~ (2026-05-29 commit e7ab4a5 완료 — b2b_seller_transit_overrides 테이블 + applyTransitOverrides overlay + /settings/transit 편집 UI + /eta·ICS 보정 적용 + '보정' 배지), 17track API 연동 시 실제 운송일 학습 → 시드 업데이트 (D3, 미래).
  - 참조: 사용자가 issue#5 댓글에 33 배대지 양식 xlsx 5개 (japan_boat/japan_air/china_air/england/usa_air) 첨부 — 양식 변환 작업 시 함께 활용

### Brainstorm approved (2026-05-28)

- [x] **#idea-8 운송장 자동 트래킹 hub (17track 1-click + status 자동 전이)** _(brainstorm approved 2026-05-28)_
  - estimated: 1.5-2h
  - prereq: 없음
  - decision_required: false
  - source: github issue#8
  - 완료: 2026-05-29 commit 0288335
  - 구현:
    - DB: `b2b_order_items.tracking_updated_at` 컬럼 + `tg_b2b_order_items_tracking_auto_transit` 트리거 (BEFORE INSERT/UPDATE OF tracking_number_overseas). 현지 트래킹 첫 입력 시 부모 b2b_orders.status `paid` → `in_transit` 자동 전이. 트리거 search_path=public,pg_temp 명시. SQL: `supabase/b2b_2026_05_29_tracking_auto_transit.sql`.
    - 주의: `tracking_number_overseas` / `carrier` 컬럼은 이미 존재했음 (b2b_order_items_image_tracking_overseas.sql). 이번엔 `tracked_carrier` 별도 컬럼 대신 기존 `carrier` 컬럼 재사용 + 신규 `tracking_updated_at` 만 추가.
    - TrackingEditor 확장: 해외 캐리어 14종 프리셋 (DHL/UPS/USPS/FedEx/EMS/Yamato/Sagawa/Japan Post/SF Express/EMS China/China Post/Royal Mail/DPD/Other) + 폼 내부에 17track 외부 link 추가. 현지·국내 캐리어 select 분리.
    - 신규 페이지 `/orders/tracking-paste`: 엑셀에서 N행 paste → 키(매입 주문번호 또는 셀러 주문번호) + 운송장 + 캐리어 (선택). 한 줄당 탭/쉼표/다중공백 자동 인식. 기본 캐리어 fallback, 미리보기, 결과 (적용·매칭실패·형식오류) 분기 표시.
    - 신규 API `POST /api/orders/tracking-bulk` (최대 500행): supplier_order_number 우선 매칭 → 없으면 셀러 order_number 매칭 (해당 주문 모든 라인). 소유권 검증 후 일괄 UPDATE. status_transitioned 결과 반환.
    - `/orders` 헤더에 "운송장 일괄" 버튼 + SellerShell 주문관리 sub-item "운송장 일괄 입력" 추가.
  - 후속 (소형): 17track 양방향 API 도입 (D3) — 운송 상태 자동 fetch + arrived_korea 자동 전이. 현재는 외부 link 만.

- [x] **#idea-9 dashboard 7일 매출 sparkline + WoW 비교** _(brainstorm approved 2026-05-28)_
  - estimated: 40-50m
  - prereq: 없음
  - decision_required: false
  - source: github issue#9
  - DB 변경: 없음
  - 완료: 2026-05-29 commit b56172c
  - 구현: `getSevenDayTrend()` (KST 14일 일별 버킷 + WoW %) + StatCard 에 inline SVG sparkline · WoW 칩 · /analytics href. "처리된 주문" / "이번 달 판매" 2 카드 적용. 주문할당량 카드는 daily trend 무의미하여 sparkline 미적용.

- [x] **#idea-10 자주 사는 매입 SKU 즐겨찾기 / 최근 매입 quick-pick** _(brainstorm approved 2026-05-28)_
  - estimated: 2-2.5h
  - prereq: 없음
  - decision_required: false
  - source: github issue#10
  - 완료: 2026-05-29 commit 54cfd38
  - 구현:
    - DB: b2b_products.is_favorite / last_purchased_at + 2 partial 인덱스 (favorite-only / last_purchased_at). b2b_order_items AFTER INSERT/UPDATE OF product_id 트리거 (SECURITY DEFINER, search_path 명시, anon/authenticated EXECUTE REVOKE). 기존 라인 backfill 포함. 원본 SQL `supabase/b2b_products.sql` 동기.
    - API: GET /api/products/quick-pick (favorites 8 + recents 8, fav 우선) / PATCH /api/products/[id]/favorite 토글.
    - UI: `SKUQuickPick` 칩 행을 /orders/new ③ 섹션 상단에 표시. 클릭 1번으로 빈 라인 찾아 자동 채움 (없으면 새 라인 append). 첫 라인이 비어있을 때만 주문 단위 배대지 default 적용.
    - UI: /products 목록에 `FavoriteStar` 컬럼 — optimistic toggle.
  - 후속 (소형): ~~/products/[id] 상세 헤더에 별 토글~~ (2026-05-29 commit bcd0491 완료), ~~/orders/new 라인 안의 ProductPicker 드롭다운 결과 행에도 별 표시~~ (2026-05-29 commit 233883a 완료 — 모든 #idea-10 후속 소진)

- [x] **#idea-11 통관 가이드 inline hint — 주문 생성 시 카테고리 자동 매칭** _(brainstorm approved 2026-05-28)_
  - estimated: 1.5h
  - prereq: 없음
  - decision_required: false
  - source: github issue#11
  - 완료: 2026-05-29 commit e7f7818
  - 구현:
    - DB: b2b_order_items.customs_category 컬럼 + CHECK 제약 (CUSTOMS_GUIDES 11종과 1:1). 기존 free-text `category` (상품 분류) 와 구분. 기록 SQL `supabase/b2b_2026_05_29_order_items_customs_category.sql`. types/supabase.ts 동기.
    - lib: `customs-guide.ts` 에 `CUSTOMS_KEYWORDS` (한·영·일 ~180개) + `matchCustomsCategory()` (최장 키워드 우선 매칭) + `isValidCustomsCategory()` + `CUSTOMS_CATEGORIES`.
    - UI: `CustomsCategoryHint.tsx` 신규 — /orders/new 각 라인 상품명 아래 inline 배너 (자동 인식 배지 + 목록통관 한도 + 신고기관 칩 + 제한 첫줄 + '변경' 토글로 override).
    - UI: /orders/bulk 그리드 '상품/매입' 그룹에 '통관 분류' select 컬럼 + SELECT_VALUE_ALIASES (식품/뷰티/전자 등 paste alias).
    - API: /api/orders + /api/orders/bulk 가 customs_category 저장. 명시값 없으면 상품명에서 서버측 자동 인식 (matchCustomsCategory).
  - 후속 (소형): ~~/orders/[id] 상세에 통관 분류 + CustomsGuidePanel 연동 표시~~ (#idea-11-fu 완료), bulk 그리드 자동 인식 결과 placeholder 노출, 'other' 도 매칭 대상에 포함할지 검토.

- [x] **#idea-11-fu 주문 상세 통관 분류 표시 + 가이드 패널** _(#idea-11 후속, 2026-05-29)_
  - estimated: 40m
  - prereq: #idea-11 완료
  - decision_required: false
  - 완료: 2026-05-29 commit 47ddc04
  - 구현: `/orders/[id]` 가 그동안 저장만 되고 노출 안 되던 `b2b_order_items.customs_category` 를 표시. 매입 라인마다 `CustomsBadge` (카테고리 emoji+label + 목록통관 한도 + 신고기관 칩, `getCustomsGuide` 사용). 배대지 사이드바 하단에 `CustomsGuidePanel` 토글 추가. SELECT 에 customs_category 추가 + OrderItem 타입 보강. 빌드·lint 0 problems.
  - 후속 (잔여): ~~bulk 그리드 자동 인식 결과 placeholder 노출~~ (2026-05-29 commit ec76478 완료 — BulkOrderClient `autoCustomsLabel`: 통관 분류 select 가 비어있을 때 상품명에서 `matchCustomsCategory` 로 인식한 카테고리를 emerald `자동: 🍱 식품` 형태 placeholder + tooltip 으로 노출, 서버측 자동 저장 결과 미리보기), ~~'other' 매칭 포함 검토~~ (2026-05-29 commit 73d45ef — 결론: 제외 유지 (fallback). 동시에 발견한 짧은 영문 키워드(pan/pot/bag/ring) substring false-positive 를 `keywordMatches()` 단어 경계 매칭으로 수정). → #idea-11/11-fu 후속 전건 소진.

### Brainstorm approved (2026-05-30)

- [x] **#idea-12 매입 시점 환율 스냅샷 활성화** _(brainstorm approved 2026-05-30, 30회차)_
  - estimated: 1.5-2h
  - prereq: 없음
  - decision_required: false
  - source: github issue#12
  - 완료: 2026-05-30 commit 34eb623
  - 구현: 주문 생성 시점 환율을 `b2b_orders.exchange_rate_applied` (jsonb, 기존 컬럼) 에 `toSnapshot(getExchangeRates())` 로 고정. `/api/orders` (단일) + `/api/orders/bulk` (요청당 1회 조회 후 전 행 적용). `/api/orders/export-csv` 가 주문별 스냅샷 우선 사용·없으면 라이브 환율 fallback + '환율 기준' 컬럼 (매입시점/현재환율(추정)) 추가. DB 변경 0 (컬럼·직렬화 함수 기존). 빌드 compiled · lint 0 problems.
  - 후속 (소형): ~~`/orders/[id]` 마진율 경고가 아직 라이브 환율 기준 — 스냅샷 있으면 그걸로 계산 + '매입 당시 환율' 표기~~ (2026-05-30 commit b18e8af 완료 — estimated_cost_krw 비어도 라인 해외가를 exchange_rate_applied 스냅샷으로 KRW 환산해 마진 경고 계산, 스냅샷 없는 과거 주문은 현재 환율 추정, '매입 당시 환율'/'현재 환율(추정)' 배지 + 비용 카드 '매입가 환산' 행), 과거 주문 snapshot backfill 은 선택 (issue#12 body 참조).

- [x] **#idea-13 배대지 정산 대조 — 예측 vs 실 청구 차이 뷰** _(brainstorm approved 2026-05-30)_
  - estimated: 1.5-2h
  - prereq: 없음
  - decision_required: false (신규 페이지 → AUTO BUT REPORT)
  - source: github issue#13
  - sketch: 신규 `/settlement` (또는 /analytics 탭) — forwarder_id group, 기간 필터, estimated_cost_krw/actual_cost_krw 합계 + variance + >15% amber flag. actual 미입력 분리 표기. DB 변경 없음.
  - 완료: 2026-05-30 commit 01a5461
  - 구현: 신규 `/settlement` 페이지 — `b2b_orders` 를 `forwarder_id` 별 집계 (forwarders(name) 조인). 기간 프리셋 (최근 30/90/180일·전체, searchParams `?period=`). 배대지별 행: 주문 수 / 대조 가능(예측·실청구 둘 다 입력) / 예측 합계 / 실청구 합계 / 차이(=실−예측, +초과·−절감) + 차이% + ±15% 초과 시 '주의' 플래그 / 실청구 미입력 건. 4 KPI 카드 (대조가능 예측·실청구 합계·차이·미입력) + 합계 tfoot + 미입력 경고 배너 + 계산 기준 안내. 취소 주문 제외. DB 변경 0. SellerShell 주문관리 children 에 메뉴 추가. 빌드 compiled · lint 0 problems.
  - note: 후속 (소형) — 마켓플레이스별 분해 / CSV export / 차이 큰 주문 drill-down 목록 은 운영 데이터 쌓인 뒤 검토.

- [x] **#idea-14 배대지 보관기간 deadline 알림** _(brainstorm approved 2026-05-30)_
  - estimated: 1-1.5h
  - prereq: 없음
  - decision_required: false
  - source: github issue#14
  - sketch: arrived_korea 진입 시각(status_history) 기준 경과일 계산, 기본 무료 보관 7일 초과 시 amber/rose 배지. 대시보드 행동 큐 + /eta(또는 신규 섹션) 목록. DB 변경 없음 (eta.ts 패턴 재사용).
  - 완료: 2026-05-30 commit 6192485
  - 구현: `src/lib/b2b/storage-deadline.ts` (`computeStorageStatus` — forwarder_submitted_at 기준 경과일·남은 무료일·level ok/warn/over, 기본 무료 7일·임박 2일 이내). `/eta` 에 '📦 배대지 보관 기간' 섹션 (status=forwarder_submitted 주문 별도 쿼리, 초과/임박/입고중 KPI + 경과·남은일·배지 테이블). `/dashboard` `StorageDeadlineMiniCard` (보관비위험/임박 카드 + top3, 임박·초과 있을 때만). DB 변경 0.
  - note: issue 의 sketch 는 `arrived_korea`+status_history 를 신호로 가정했으나, (1) status_history 는 status route 가 실제로 기록하지 않아 항상 빈 배열, (2) 보관비는 해외 배대지에 입고된 `forwarder_submitted` 상태(=배대지 보관 중)에서 누적되고 `arrived_korea`(한국 통관)는 이미 출고 후라 부적합. 따라서 실 컬럼 `forwarder_submitted_at` + `forwarder_submitted` status 를 신호로 사용 (더 정확·신뢰 가능). 후속(선택): 배대지별 무료 보관일 override (현 기본 7일 상수), status route 의 status_history 기록 활성화.

- [x] **#idea-15 부가세 자료 분기/연간 프리셋 + CSV 합계 요약행** _(brainstorm approved 2026-05-30)_
  - estimated: 40-60m
  - prereq: 없음 (#idea-12 환율 스냅샷 완료 — 연동 시 더 정확)
  - decision_required: false
  - source: github issue#15
  - sketch: export 다운로드 UI 에 분기/연간 프리셋 버튼 (from/to 자동 계산) + export-csv route 에 마지막 합계행 (총 매입/판매/마진 KRW · 통화별 소계). 기존 로직 재사용.
  - 완료: 2026-05-30 commit c53a1e6
  - 구현: **분기/연간 프리셋 버튼은 `/settings/compliance` `TaxCsvExportSection` 에 이미 존재** (이번/지난 분기·이번/지난 연도, from/to 자동 계산). 미구현이던 **CSV 합계 요약행만 추가** — `export-csv/route.ts` 데이터 루프에서 KRW 환산 매입가·판매가·마진 + 통화별(해외합계·KRW·건수) 누적 후, 데이터 라인 뒤에 빈 줄 + 통화별 소계 행(정렬) + `■ 합계` 행(총 N건·총 매입/판매/마진 KRW). sparse row 헬퍼로 KRW 컬럼(17/18/19) 정렬 배치. KRW 환산 불가 라인은 합계서 제외(부분 데이터 안전). `X-Row-Count` 헤더는 데이터 행만 카운트하도록 `dataRowCount` 사용(요약행 제외). compliance 안내문 20→21컬럼+합계행 명시로 갱신. DB 변경 0. 빌드 compiled · lint 0 problems.
  - note: 후속(소형) — 합계행 환율 기준 혼재 시(매입시점+추정 혼합) 표기, CSV 외 xlsx 직접 양식은 v0.5.

### Audit 발견 2026-05-30 (daily self-audit · 23회차)

- [x] **#auto-I a11y: 운송장 붙여넣기 textarea + SKU 불러오기 검색 input aria-label** _(audit 발견 2026-05-30)_
  - estimated: 10m
  - prereq: 없음
  - decision_required: false
  - finding: (1) `/orders/tracking-paste` `TrackingPasteClient.tsx:200` 의 메인 붙여넣기 textarea — placeholder 만 있고 접근성 이름 없음 (`<h2>붙여넣기</h2>` 는 섹션 heading 이라 미연결). (2) `ProductPicker.tsx:120` 의 "등록된 SKU 에서 불러오기" 드롭다운 검색 input — placeholder 만 있고 라벨·aria-label 없음. 스크린리더가 필드 목적 못 읽음.
  - severity: low
  - 완료: 2026-05-30 commit a58f56c
  - fix: 두 컨트롤에 `aria-label` 추가 (순수 additive, 동작·시각 무변경) — textarea `운송장 붙여넣기 (한 줄당: 주문번호, 운송장 번호, 캐리어)`, SKU 검색 input `등록된 SKU 검색 (SKU 코드 또는 상품명)`. 18~22회차 a11y 일관성 보강과 동일 패턴. 빌드 compiled · lint 0 problems.

### Audit 발견 2026-05-31 (daily self-audit · 43회차)

- [x] **#auto-J bug: NotificationBell.handleClick fire-and-forget fetch 미처리 rejection** _(audit 발견 2026-05-31)_
  - estimated: 10m
  - prereq: 없음
  - decision_required: false
  - finding: `src/components/b2b/NotificationBell.tsx:103-107` 의 `handleClick` 이 `fetch('/api/notifications/read', …).then(() => refresh())` 를 `.catch()` 없이 fire-and-forget → 네트워크 실패 시 unhandled promise rejection (콘솔 "Uncaught (in promise)"). 같은 파일 sibling `markAllRead` (87-99) 은 try/finally 로 감쌈 → 비대칭.
  - severity: low
  - 완료: 2026-05-31 commit eb41b3d
  - fix: `.then(() => refresh()).catch(() => {})` 추가 — fire-and-forget 동작·네비게이션(router.push) 무지연 유지하면서 네트워크 실패 시 unhandled promise rejection 만 제거. 16회차에서 `await` 추가는 router.push 지연 회귀라 보류했으나 `.catch()` 는 그와 무관한 순수 additive 하드닝 (sibling markAllRead 방어 패턴과 정렬, zero regression). 빌드 compiled · lint 0 problems.

### Brainstorm approved (2026-05-31, 52회차)

- [x] **#idea-16 주문 1-click 복제 (재주문)** _(brainstorm approved 2026-05-31)_
  - estimated: 45m
  - prereq: 없음
  - decision_required: false
  - source: github issue#16
  - sketch: /orders/[id] 헤더 + OrderListClient 행 액션에 "복제" 버튼. 기존 주문을 sessionStorage 직렬화 → /orders/new mount 시 prefill (NewOrderForm prefill prop 재활용). prefill 범위: 구매자 PII·상품 라인·배대지·통관부호. 마켓 주문번호는 비움(중복 방지). DB 변경 없음 (읽기 + 클라 prefill).
  - 완료: 2026-05-31 commit 60aa714 (52회차)
  - 구현: sessionStorage 대신 `/orders/new?duplicate=<orderId>` query param 채택 (기존 `/refunds/new?order_id=` 패턴과 일관, 서버 컴포넌트 fetch라 클라 fetch 불필요). `/orders/[id]` 액션 섹션에 '이 주문 복제(재주문)' indigo 버튼. new/page.tsx 가 소유 주문(account_id 명시 가드 + deleted_at null)을 fetch → `DuplicateSource` 구성 → NewOrderForm `duplicateFrom` prop. prefill: 구매자 PII·배대지(주문 단위)·상품 라인(productId/SKU label/supplierSite/상품명/URL/옵션/수량/통화/단가/중량/판매가/이미지/라인 배대지/통관분류). 비움: 마켓 주문번호·매입 주문번호·운송장(과거 매입 고유값)·주문번호·주문일(새 발급). SKU label 은 b2b_order_items.product_id FK 미등록이라 b2b_products 별도 in() 조회. 복제 모드 시 헤더 타이틀 '주문 복제(재주문)' + indigo 안내 배너. DB 변경 0. 빌드 compiled · lint 0 problems.
  - note: OrderListClient 행 액션 추가는 행이 Link 래핑이라 중첩 인터랙션 a11y 위험 → 후속(선택)으로 보류. 상세 페이지 버튼으로 1-click 재주문 핵심 가치는 전달됨.

- [x] **#idea-17 매칭 시 영수증↔주문 금액 불일치 경고** _(brainstorm approved 2026-05-31)_
  - estimated: 40m
  - prereq: 없음
  - decision_required: false
  - source: github issue#17
  - sketch: /orders/matching 추천 계산 시 후보 주문 라인 합계 대비 영수증 total_foreign 비율 → suggestion.amountDelta. ReceiptRow 에 ±10% 초과 ⚠️ 배지 + 실제 차액. 통화 불일치는 "통화 다름" 라벨(환산 없이 경고만). DB 변경 없음.
  - 완료: 2026-05-31 commit ca09a7f (53회차)
  - 구현: `import-matcher.ts` 에 `compareAmounts(receipt, order)` 추가 — 같은 source 라인만 합산, deltaPct(부호有: 음수=주문이 더 큼=분할발송 의심) + currencyMismatch + orderCurrency 반환. matching/page.tsx 가 매칭된 주문(우선) 또는 top1 추천 주문 대상으로 cmp 계산해 client 에 `amount` 전달. OrderMatchingClient `AmountWarning` 컴포넌트: 통화 불일치 시 rose "통화 다름" 배지(비교 불가), ±10%(AMOUNT_DELTA_THRESHOLD) 초과 시 amber 금액차이 배지(차이%+영수증/주문/차액 + 방향 hint title). 매칭된 영수증에도 적용(자신있게 매칭한 오매칭 T1 사후 인지). DB·외부의존 0. build·lint(0 problems) 통과.

- [x] **#idea-18 주문 상태 변경 이력 타임라인** _(brainstorm approved 2026-05-31)_
  - estimated: 1h
  - prereq: 없음
  - decision_required: false (audit_log write 추가 → AUTO-RUN BUT REPORT)
  - source: github issue#18
  - sketch: status route update 성공 직후 admin client 로 b2b_audit_log insert (entity='b2b_order', action='status_change', meta={from,to}, PII 미포함). /orders/[id] 서버 컴포넌트에서 audit row 조회 → 타임라인 카드 (v2.1 border-l accent). DB 신규 컬럼 없음 (기존 b2b_audit_log).
  - 완료: 2026-05-31 commit 6e65014 (54회차)
  - 구현: `src/lib/b2b/audit.ts` 의 `logOrderStatusChange()` best-effort 헬퍼 (action='order_status_changed', target_type='b2b_order', metadata={from,to,via,note}, PII 미포함, insert 실패해도 throw X). 상태 변경 4개 지점 wiring — 직접 변경(`orders/[id]/status` via='manual', user_id 기록), 영수증 매칭→paid(`imports/.../matches` via='match'), 환불 요청→refund_requested(`refunds` POST via='refund'), 환불 정산→refunded·거절→completed 복귀(`refunds/[id]` PATCH via='refund'). `/orders/[id]` 좌측에 violet border-l 타임라인 카드: from→to(STATUS_META 라벨) + via 배지(직접/매칭/환불/자동) + 시각 + "주문 등록" 기준점. RLS owner-select 로 본인 row 만 조회. 오래된 주문은 기록 없어 안내문. build·lint(0) 통과.

- [x] **#idea-19 전역 빠른 검색·점프 (⌘K command palette)** _(brainstorm approved 2026-05-31)_
  - estimated: 1.5h
  - prereq: 없음
  - decision_required: false (user approve 수신 — 기본값: ⌘K/Ctrl+K + 상단바 버튼, cmdk 패키지 미추가 자체 구현)
  - source: github issue#19
  - 완료: 2026-05-31 commit bbf540c (55회차)
  - 구현: `src/components/b2b/CommandPalette.tsx` (client) + SellerShell mount. ⌘K/Ctrl+K 전역 단축키 + 상단바 트리거 버튼(데스크탑 "검색… ⌘K" / 모바일 아이콘)으로 오픈, ESC·백드롭 닫기. 3 섹션: 메뉴(정적 21개 한·영 키워드 필터), 주문(`/api/orders?q=&limit=8`), 상품(`/api/products?q=`). 220ms 디바운스 + AbortController, trimmed 2자 이상일 때만 서버 검색(미만은 메뉴만). 방향키↑↓ 순환 탐색 + Enter SPA `router.push` + 마우스 hover 선택 + scrollIntoView. set-state-in-effect 회피: 부모가 `key` 로 열릴 때마다 remount(상태 초기화) + autoFocus, selected 는 effect 보정 대신 사용 시점 clamp(activeIndex). 기존 상단바 GET form 검색 제거(팔레트로 대체). DB 변경 0. build·lint(0) 통과.
  - 후속 (소형): 단골 구매자(/clients) 검색 결과 섹션 추가, 최근 방문/최근 검색 캐시, 결과 키보드 home/end 점프 — 운영 데이터 쌓인 뒤 검토.

---

## P1.5 — idle 라운드 자율 일감 풀 (P1 비었을 때 1건씩 · decision_required: false)

P1 (brainstorm 승인분) 이 비고 inbox 도 조용할 때, `chore(queue): P1 소진` 즉시 idle 대신
아래 풀에서 **명확한 net-positive 슬라이스 1건**을 처리한다. 대부분 "스윕(sweep)" 이라
한 회차에 페이지·컴포넌트 1개 단위로 잘라서 진행하고, 진행분을 Fire 이력에 한 줄 남겨 다음 회차가 이어받는다.

**철칙 (agent-decision-rules 의 net-negative churn 회피와 동일)**: 억지로 변경을 만들지 말 것.
명확한 개선 슬라이스가 없으면 그 항목 skip → 다음 항목 → 그래도 없으면 그냥 `chore(queue): P1 소진 — idle` 로 종료.
모든 변경은 build·lint 0 통과 + 동작/시각 회귀 0 이어야 한다 (순수 additive·정리 위주).

우선순위 순 (위에서부터 점검):

- [ ] **#idle-1 디자인 시스템 일관성 스윕** _(rolling)_ — `_memory/design-system.md` 토큰 대비 한 회차 **1 페이지/섹션**. 카드 `shadow-sm` 누락, 비토큰 색(임의 hex/색), 간격·radius 불일치, accent `border-l-[3px]` 패턴 이탈, 본문 `text-white` 오용 등 1건씩 정렬. 시각 회귀 없는 토큰 정렬만.
- [ ] **#idle-2 빈/로딩/에러 상태 보강** _(rolling)_ — 목록·상세 페이지 한 회차 1개. empty state 맥락 문구+CTA, 로딩 skeleton, 에러 분기(없으면 추가). 신규 페이지(재주문·타임라인·정산 등) 우선.
- [ ] **#idle-3 a11y 일관성 스윕** _(rolling)_ — 신규/누락 컴포넌트 한 회차 1군. placeholder-only input 의 `aria-label`, 아이콘 버튼 라벨, focus ring, 대비(WCAG AA), 키보드 내비. (⌘K 팔레트·상태 타임라인·주문 복제 폼·BulkMatchBar 등 최근 추가분 우선)
- [ ] **#idle-4 모바일 레이아웃 점검** _(rolling)_ — 핵심 플로우(주문 확인·매칭·알림·대시보드) 한 회차 1 페이지. 좁은 뷰포트 overflow·터치 타겟(≥40px)·가독성. gstack `/browse` 로 360px 스크린샷 근거 권장.
- [ ] **#idle-5 중복 유틸 통합** _(rolling)_ — `formatKRW`·`formatForeign`·`formatDate`·`formatWeight` 등 여러 파일에 복붙된 헬퍼를 `src/lib/b2b/format.ts` 로 통합하고 import 교체. 한 회차 몇 파일씩, 동작 동일 보장.
  - 65회차 (2026-06-01) commit 8074a5e: `src/lib/b2b/format.ts` 신설 (formatKRW/Foreign/Date/DateTime/Weight 5종, ko-KR, byte-identical 구현 통합). 1차 migrate 4파일 — orders/[id], refunds/page, refunds/[id], OrderListClient. settlement 의 formatKRW 는 `₩` prefix·Math.round 의 다른 구현이라 미통합. 잔여 중복: analytics/billing/clients/imports/imports[id]/recommendations/notifications/products/templates/support 등 formatKRW·formatDate·formatDateTime·formatForeign (단 일부는 시그니처·locale 미세 차이 — 다음 회차 검증 후 통합).
  - 66회차 (2026-06-01) commit ae8e1c2: 잔여 12파일 검증 후 **output-identical 3건만** 통합 — templates/products `formatDateTime`(동일 toLocaleString), billing `formatKRW`(null→—·라운딩없음·+원, 동일). **의도적 미통합(divergent output)**: support/[id]·support·notifications `formatDate`=`yy.mm.dd hh:mi` 커스텀, imports·imports[id]·clients·recommendations `formatForeign/formatKRW`=`₩/¥/$` 심볼 prefix, imports·extension `formatDate`=`yy.mm.dd`, clients `formatDate`=`slice(0,10)`, analytics `formatKRW`=Math.round 선적용, billing `formatDate`=null-guard(공용 formatDate 는 `new Date(null)`→1970 미가드라 미통합). → #idle-5 사실상 소진(남은 건 전부 다른 출력 포맷이라 통합 시 회귀).
- [ ] **#idle-6 잔여 `as any` 제거 마무리** _(거의 소진)_ — 남은 route/컴포넌트의 느슨한 캐스트를 typed client 로. types/supabase.ts 에 타입 있는 것만. (이전에 대시보드 silent 버그를 숨긴 류라 예방 가치 있음)
  - 67회차 (2026-06-01) commit 1a0e7f2: support 2파일 정리 — `support/page.tsx`·`support/[id]/page.tsx` 가 `b2b_support_tickets`/`b2b_support_messages` (둘 다 types/supabase.ts 존재) 를 `createClient()`/`createAdminClient()` (둘 다 `<Database>` typed) 인데도 `as any` 로 우회하고 결과 수동 재타입. 캐스트·eslint-disable 4건 제거하고 typed client 직접 사용 (출력·동작 무변경). `messages.sender` 만 `'seller'|'admin'` narrowing 위해 의도적 캐스트 유지. 잔여 `as any` 9건: signup step-2/5 (`createClient() as any` — 가입 단계 b2b_accounts 조회, 타입 검증 후 다음 회차), dashboard 3건 (536/584/873 — admin/supabase 광범위 쿼리), account/delete route 1건, forwarder-export·form-templates 의 `buf/xlsxBuffer as any` 2건 (exceljs Buffer 호환 — 의도적 유지).
  - 68회차 (2026-06-01) commit fda79de: signup step-2/5 정리 — `step-2/page.tsx` (b2b_terms_versions 조회) + `step-5/page.tsx` (b2b_accounts business_no step-4 가드) 가 `createClient()` (이미 `SupabaseClient<Database>` typed) 를 `as any` 로 우회하던 것 제거. b2b_terms_versions·b2b_accounts 와 전 select 컬럼 types/supabase.ts 존재 확인 (Term 인터페이스 = 선택 컬럼과 정확히 일치). eslint-disable 3건 + `({data,error}:any)` 어노테이션 제거하고 typed client·추론 타입 직접 사용 (출력·동작·쿼리 무변경). build·lint(0 problems) 통과. 잔여 제거 대상 `as any` 4건: dashboard 3건 (536/584/873 — admin/supabase 광범위 쿼리, 컬럼 검증 필요), account/delete route 1건. exceljs Buffer 2건은 의도적 유지.
- [ ] **#idle-7 dead code·unused export 정리** _(rolling)_ — 미사용 export/변수/주석 처리된 코드 한 회차 1 모듈. lint 가 못 잡는 것 위주.
- [ ] **#idle-8 DB 성능 모니터 점검(2026-08-28 재검토 대상)** _(점검만)_ — `#auto-G`·`#auto-H` 의 미인덱스 FK·unused index 후보가 행 수 증가로 활용 시작됐는지 advisor 로 확인만. 실제 인덱스 추가는 재검토 기한까지 보류 (변경 없이 점검 1줄 기록).

> 추가 idle 일감이 떠오르면 이 풀 끝에 `#idle-N` 으로 append. 사용자 결정이 필요하면 P1.5 가 아니라 STOP&ASK(issue).

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

- P1 자율 가능: **40개 완료, pending 0** (#idea-19 ⌘K command palette 2026-05-31 55회차 commit bbf540c 완료. 52회차 brainstorm approved 4건(#idea-16/17/18/19) 전건 소진. **P1 큐 비었음 — 다음 brainstorm 승인 대기**).
- Phase 0 잔여: **2개** (#PH0-5 detail page, #PH0-6 KPI 카드) — 둘 다 main repo 핸드오프이며 **base 페이지 핸드오프 (jimpass-agent-platform#3, PH0-4) 가 아직 open** 이라 blocked. main#3 close 되면 그 때 handoff issue 생성.
- P0 결정 대기: **0개 (issue#7 답신 수신·종결 처리 중)** — 30회차에 사용자 최종 답신(item 2 적용요청, 나머지 no). item 2 는 GoTrue 대시보드 설정이라 agent MCP 적용 불가 → issue 에 단계 안내 댓글 + 사용자 토글 대기.
- **P1.5 idle 라운드 자율 일감 풀: 8개** (#idle-1~8, rolling 스윕) — P1 비었을 때 1건씩. `as any` 즉흥 정리 대신 디자인 일관성·빈/로딩/에러 상태·a11y·모바일·유틸 통합 등 큐레이션된 일감.
- P2 사용자 액션 대기: **4개**
- P3 미래: **7개**

---

## 종료 조건

P1 모두 `[x]` (2026-05-29 #idea-11 완료로 P1 전건 소진) → 큐 비었음 감지 → `chore(queue): P1 소진` commit 후 idle.
사용자가 새 항목 추가하면 다음 fire 부터 다시 작동.

### Fire 이력 (idle)

- 2026-05-29: P1 소진 확인 + inbox polling (decision-needed 1 open=#7 user reply 대기 / idea 0 / handoff-from-main 0). Phase 0 잔여 #PH0-5·#PH0-6 은 main#3 (PH0-4 base page) open 이라 blocked → 핸드오프 보류. idle.
- 2026-05-29 (2회차): inbox polling 동일 (decision-needed 1 open=#7 our 분석 댓글 user reply 대기 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments — main agent 미처리) → Phase 0 계속 blocked. P1 pending 0건. idle.
- 2026-05-29 (3회차): inbox polling 동일 (decision-needed 1 open=#7 user reply 대기 / idea 0 / handoff-from-main 0). main#3 여전히 open → Phase 0 blocked. 정식 P1 pending 0건이라 idle 대신 문서화된 AUTO-RUN 후속 1건 진행 — #idea-11-fu (주문 상세 통관 분류 표시 + 가이드 패널) commit 47ddc04. 빌드·lint 통과.
- 2026-05-29 (4회차): inbox polling 동일 (decision-needed 1 open=#7 — 우리 분석 댓글이 최신, user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments) → Phase 0 blocked. 정식 P1 pending 0건이라 문서화된 AUTO-RUN 후속 1건 진행 — #idea-10 후속 (SKU 상세 헤더 즐겨찾기 별 토글) commit bcd0491. 빌드·lint 0 problems 통과. 잔여 후속: ProductPicker 드롭다운 별 표시, 환불 대시보드 미니카드, forwarder UK/GB alias 등.
- 2026-05-29 (5회차): inbox polling 동일 (decision-needed 1 open=#7 — 우리 분석 댓글이 최신, user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments) → Phase 0 blocked. 정식 P1 pending 0건이라 문서화된 AUTO-RUN 후속 1건 진행 — #idea-10 마지막 후속 (ProductPicker 드롭다운 결과 행 즐겨찾기 별 표시 + 즐겨찾기 상단 정렬) commit 233883a. 빌드·lint 0 problems 통과. → #idea-10 후속 전건 소진. 잔여 후속: 환불 대시보드 미니카드, forwarder UK/GB alias, bulk 통관 자동 인식 placeholder 등.
- 2026-05-29 (6회차): inbox polling 동일 (decision-needed 1 open=#7 — 우리 분석 댓글이 최신, user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments) → Phase 0 blocked. 정식 P1 pending 0건이라 문서화된 AUTO-RUN 후속 1건 진행 — #idea-3b 후속 (대시보드 이달 환불 현황 미니카드) commit 47542a4. RefundMiniCard: 이달 환불 신청 있을 때만 표시, 신청/처리대기/정산완료 3 카운트 + 정산 완료 환불액 KRW 합계 (b2b_refunds 세션 RLS, requested_at >= 이달 1일). 빌드·lint 0 problems 통과. 잔여 후속: forwarder UK/GB alias, bulk 통관 자동 인식 placeholder, 환불 페이지네이션 cursor 등.
- 2026-05-29 (7회차): inbox polling 동일 (decision-needed 1 open=#7 — 우리 분석 댓글이 최신, user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments) → Phase 0 blocked. 정식 P1 pending 0건이라 문서화된 AUTO-RUN 후속 1건 진행 — #idea-5 후속 (forwarder_country UK/GB alias 통합) commit 7b83ab7. eta.ts `normalizeOriginCountry()` 추가 — GB/England/Britain→UK, USA/America→US, Japan→JP, China→CN, Germany→DE, HongKong→HK. buildEtaLookup·computeOrderEta 양쪽 정규화 + /eta 라벨·ICS export 표기 일괄 적용 → 외부/수기 입력 'GB' 등이 OTHER fallback 으로 안 빠지고 올바른 시드 매칭. 빌드·lint 0 problems 통과. 잔여 후속: bulk 통관 자동 인식 placeholder, 환불 페이지네이션 cursor, 셀러별 transit override 등.
- 2026-05-29 (8회차): inbox polling 동일 (decision-needed 1 open=#7 — 우리 분석 댓글이 최신, user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments) → Phase 0 blocked. 정식 P1 pending 0건이라 문서화된 AUTO-RUN 후속 1건 진행 — #idea-11 후속 (bulk 그리드 통관 자동 인식 placeholder 노출) commit ec76478. BulkOrderClient `autoCustomsLabel()` — 통관 분류 select 비어있을 때 상품명에서 `matchCustomsCategory` 인식 카테고리를 emerald `자동: 🍱 식품` placeholder + '비우면 자동 인식' tooltip 으로 표시 (서버 자동 저장 결과 미리보기). 빌드·lint 0 problems 통과. 잔여 후속: 환불 페이지네이션 cursor, 셀러별 transit override, 'other' 통관 매칭 포함 검토 등.
- 2026-05-29 (9회차): inbox polling 동일 (decision-needed 1 open=#7 — 우리 분석 댓글이 최신, user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments) → Phase 0 blocked. 정식 P1 pending 0건이라 문서화된 AUTO-RUN 후속 1건 진행 — #idea-3b 후속 (환불 페이지네이션 cursor) commit d4b9878. /refunds 가 그동안 50건만 보이고 "v0.5" placeholder 만 띄우던 것을 실제 cursor 페이지네이션으로 교체 — `requested_at` `lt()` cursor + status 필터 보존 (`buildHref`), "다음 50건 →" / "← 처음으로" 링크, 페이지 footer 에 "최신 N건"/"마지막 페이지" 상태 표시. 순수 서버 컴포넌트 유지. 빌드·lint 0 problems 통과. 잔여 후속: 셀러별 transit override, 'other' 통관 매칭 포함 검토, card 한도 경고 banner 등.
- 2026-05-29 (10회차): inbox polling 동일 (decision-needed 1 open=#7 — 우리 분석 댓글이 최신, user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments) → Phase 0 blocked. 정식 P1 pending 0건이라 문서화된 AUTO-RUN 후속 1건 진행 — #idea-4 후속 (/settings/cards 카드별 이달 매입 합계 + 한도 경고 banner) commit fbaacfb. page 서버 컴포넌트가 카드별 이달 매입 KRW 합계를 계산 (dashboard CardSpendCard 와 동일 `b2b_orders!inner` account 격리), PaymentCardsManager active 카드 행마다 "이달 매입 ₩X · N건" + 한도 대비 사용률 progress bar (emerald<80% / amber≥80% / rose≥100% 초과), 한도 80%+ active 카드는 상단 amber gradient 경고 배너에 집계. → #idea-4 후속 전건 소진. 빌드·lint 0 problems 통과. 잔여 후속: 셀러별 transit override, 'other' 통관 매칭 포함 검토 등.
- 2026-05-29 (11회차): inbox polling 동일 (decision-needed 1 open=#7 — 우리 분석 댓글이 최신, user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments) → Phase 0 blocked. 정식 P1 pending 0건이라 문서화된 AUTO-RUN 후속 1건 진행 — #idea-5 후속 (셀러별 transit 평균 override) commit e7ab4a5. 신규 테이블 `b2b_seller_transit_overrides` (account×country×method PK, RLS tenant rw initplan 패턴, touch trigger) Supabase MCP apply + types/supabase.ts 재생성. eta.ts `applyTransitOverrides()` 가 글로벌 시드 lookup 위에 셀러 보정을 overlay (avg 교체, min/max 보존). `/api/transit-overrides` PUT(upsert)/DELETE(복귀) + admin client 소유권 검증. `/settings/transit` 서버 페이지 + `TransitOverrideEditor` 클라이언트 (국가·운송수단별 시드 대비 보정 입력·초기화). `/eta`·ICS export 가 보정 overlay 적용 + '보정' 배지 표시, /settings 인덱스에 '배송·ETA' 섹션 카드 추가. 빌드 통과·lint 0 problems. 잔여 후속: 'other' 통관 매칭 포함 검토, 17track 양방향 API(D3, 미래) 등.
- 2026-05-29 (12회차): inbox polling 동일 (decision-needed 1 open=#7 — 우리 분석 댓글이 최신, user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments) → Phase 0 blocked. 정식 P1 pending 0건이라 문서화된 AUTO-RUN 후속 1건 진행 — #idea-11 후속 ('other' 통관 매칭 포함 검토 + 매칭 정확도) commit 73d45ef. 결론: 'other' 는 fallback 으로 키워드 사전 제외 유지 (자동 인식은 명시 카테고리만 반환, 미매칭 null → 셀러 수동 선택). 검토 중 발견한 실제 버그 동시 수정 — `matchCustomsCategory` 가 pan/pot/bag/ring 등 ≤4자 영문 키워드를 naked substring 으로 매칭해 "spring water"→jewelry, "japan import"→생활용품 오분류. `keywordMatches()` 단어 경계 헬퍼 도입 (짧은 ASCII 키워드는 양옆 a-z 미접촉 시만 매칭, CJK·5자+ 영문은 substring 유지, longest-match-wins 보존). 11 경계 케이스 검증 통과. 빌드·lint 0 problems. → #idea-11/11-fu 후속 전건 소진. 잔여 후속: 17track 양방향 API(D3, 미래) 등.
- 2026-05-29 (14회차): inbox polling 동일 (decision-needed 1 open=#7 — 우리 분석 댓글이 최신, user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments) → Phase 0 blocked. P1 pending 0 + #idea 후속·문서화 tech-debt 전건 소진 → AUTO-RUN 자체 점검(self-audit) 실행. 보안 advisor: b2b 신규 flag 0 (유일 b2b WARN = b2b_marketwide_supplier_stats, #auto-C 의도 유지). 성능 advisor: 13회차 b2b_withdrawal_notices 적용으로 미인덱스 FK 11→12 증가 (신규 b2b_withdrawal_notices.client_id, ON DELETE SET NULL; 같은 테이블 account_id/order_id 는 covering index 존재). 결정 변동 없음 — #auto-H 와 동일하게 2026-08-28 재검토까지 deferred (행 0건, seq scan 정상). commit 51a90f7: snapshot SQL `b2b_2026_05_29_unindexed_fk_snapshot.sql` 를 12건으로 갱신해 향후 재검토 정확성 유지 (실제 인덱스 추가 없음). 빌드 compiled.
- 2026-05-29 (15회차): inbox polling 동일 (decision-needed 1 open=#7 — 우리 분석 댓글이 최신, user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments) → Phase 0 blocked. P1 pending 0 + #idea 후속 전건 소진 + 14회차에서 advisor/FK snapshot 이미 갱신(오늘) → 동일 self-audit 반복은 noise 라 생략. 대신 코드 품질 실측 점검만 수행: `npm run lint` 0 problems / 루트 layout `robots:{index:false,follow:false}` 전역 + 37 페이지 자체 noindex (커버리지 갭 없음) / src 내 stray `console.log`·`console.debug` 0건 / 보안 advisor b2b WARN 1건(=b2b_marketwide_supplier_stats, #auto-C 의도 유지, 신규 0). DB 무변경(git clean)이라 12건 미인덱스 FK snapshot 그대로 유효. 실제 변경 없이 idle. commit: `chore(queue): P1 소진 — idle (15회차, 품질 점검 clean)`.
- 2026-05-29 (16회차): inbox polling 동일 (decision-needed 1 open=#7 — 우리 분석 댓글이 최신, user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments) → Phase 0 blocked. P1 pending 0 + #idea 후속 전건 소진. 14·15회차에서 advisor/FK snapshot·품질 점검 이미 오늘 완료라 반복은 noise. AUTO-RUN 후보 1건 탐색(Explore) → NotificationList.handleClick fire-and-forget fetch 가 markAll(await) 과 비대칭이라는 후보 발견했으나, `await` 추가 시 `router.push` 네비게이션이 네트워크 왕복만큼 지연되어 UX 회귀 → SPA 에선 fetch 가 router.push 후에도 살아남아 read-state 정상 영속하므로 현 패턴은 의도된 trade-off, fix 안 함(net-negative 회피). `npm run lint` 0 problems 재확인. 실제 코드 변경 없이 idle. commit: `chore(queue): P1 소진 — idle (16회차)`.
- 2026-05-29 (17회차): inbox polling 동일 (decision-needed 1 open=#7 — 우리 분석 댓글이 최신, user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments) → Phase 0 blocked. P1 pending 0 + #idea 후속 전건 소진. `npm run lint` 0 problems 재확인. AUTO-RUN 후보를 Explore 로 1건 정밀 탐색 → 유일 후보 (`api/form-templates/route.ts:242` `user_input_label: label || null` 의 column_label 과의 비대칭)는 "사용자 미입력 vs 빈 입력" 구분 의도일 가능성이 높아 net-positive 불확실 → 수정 시 churn/risk 라 보류 (15·16회차와 동일 net-negative 회피 원칙). 실제 코드 변경 없이 idle. commit: `chore(queue): P1 소진 — idle (17회차)`.
- 2026-05-29 (18회차): inbox polling 동일 (decision-needed 1 open=#7 — 우리 분석 댓글이 최신, user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments) → Phase 0 blocked. P1 pending 0 + #idea 후속 전건 소진. `npm run lint` 0 problems 재확인. AUTO-RUN 후보를 Explore 로 정밀 탐색 → 실제 net-positive a11y 일관성 gap 발견·수정 (15~17회차의 net-negative 보류와 달리 이번엔 명확한 안전 개선) — commit b80324d. 세 개의 거의 동일한 검색 모달 중 `ImportMatchAction` 은 닫기 버튼에 `aria-label='닫기'` 보유하나 `MultiMatchPanel`·`OrderMatchingClient` 의 `×` 닫기 버튼 2건은 누락 → 동일 패턴으로 보강. 동작·스타일·UX 무변경, 스크린리더 접근성만 향상 (zero regression). 빌드 통과·lint 0 problems.
- 2026-05-29 (19회차): inbox polling 동일 (decision-needed 1 open=#7 — 우리 분석 댓글이 최신, user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments) → Phase 0 blocked. P1 pending 0 + #idea 후속 전건 소진. `npm run lint` 0 problems 재확인. 18회차와 동일 원칙으로 명확한 net-positive a11y 일관성 gap 1건 발견·수정 — commit facafd6. `TemplateMappingEditor` 의 양식 매핑 테이블에서 placeholder-only 또는 라벨 미연결 input 6건 (컬럼 헤더 라벨 / 고정 값 / 조합 템플릿 / 질문 라벨 / 옵션 enum / 기본 값) 에 `aria-label` 추가 — placeholder 는 접근성 이름 대체가 안 되므로 스크린리더가 필드 목적을 읽지 못하던 것을 보강. 순수 additive (동작·스타일·시각 무변경, zero regression). 빌드 compiled · lint 0 problems.
- 2026-05-30 (20회차): inbox polling 동일 (decision-needed 1 open=#7 — 우리 분석 댓글이 최신, user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments) → Phase 0 blocked. P1 pending 0 + #idea 후속 전건 소진. `npm run lint` 0 problems 재확인. 18·19회차와 동일 원칙으로 명확한 net-positive a11y 일관성 gap 1건 발견·수정 — commit 86ca69b. `ProductForm` 의 마켓 매핑·매입처 매핑 그리드 행에서 placeholder 또는 첫 옵션만 있고 접근성 이름이 없던 폼 컨트롤 8건 (마켓 select·상품번호·옵션·판매가 input / 매입처 select·상품 URL·단가 input·통화 select) 에 `aria-label` 추가 — placeholder/option 텍스트는 접근성 이름 대체가 안 되므로 스크린리더가 필드 목적을 읽지 못하던 것을 보강. 제거(×) 버튼은 이미 `aria-label="제거"` 보유. 순수 additive (동작·스타일·시각 무변경, zero regression). 빌드 compiled · lint 0 problems.
- 2026-05-30 (21회차): inbox polling 동일 (decision-needed 1 open=#7 — 우리 분석 댓글이 최신, user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments, 2026-05-27 이후 무변동) → Phase 0 blocked. P1 pending 0 + #idea 후속 전건 소진. `npm run lint` 0 problems 재확인. 18~20회차와 동일 원칙으로 명확한 net-positive a11y 일관성 gap 1건 발견·수정 — commit 0303840. `TransitOverrideEditor` (셀러별 운송일수 보정 테이블): 행마다 placeholder 만 있고 라벨 미연결인 number input (셀 안에 있어 `<th>`-input 자동 연결 안 됨, 스크린리더가 "spin button" 으로만 읽음) + 시각 텍스트가 동일("저장"/"초기화")이라 행 구분 불가한 저장/초기화 버튼 — 3종 컨트롤에 국가·운송수단 context 포함 `aria-label` 추가 (`미국 항공 운송일수 보정 (일, 기본 7일)` 형태). TrackingEditor 는 모든 컨트롤이 `<label>` wrap(암묵 연결)이라 gap 없음 확인 후 제외. 순수 additive (동작·스타일·시각 무변경, zero regression). 빌드 compiled · lint 0 problems.
- 2026-05-30 (22회차): inbox polling 동일 (decision-needed 1 open=#7 — 우리 분석 댓글이 최신, user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments, 2026-05-27 이후 무변동) → Phase 0 blocked. P1 pending 0 + #idea 후속 전건 소진. `npm run lint` 0 problems 재확인. 18~21회차와 동일 원칙으로 명확한 net-positive a11y 일관성 gap 1건 발견·수정 — commit 6f362f8. `BulkOrderClient` (대량 주문 입력 그리드): `Cell` 의 select/input 이 placeholder·title 만 있고 라벨 미연결이라 스크린리더가 "combobox/edit text" 로만 읽던 것 → 컬럼명+행번호 `aria-label` (`마켓 (1행)` 형태) 보강. `SkuPickerCell` 의 combobox input 은 role=combobox 인데 접근성 이름이 없어 `상품명 또는 SKU 검색 (1행)` 추가. 삭제 버튼은 이미 `${n}행 삭제` aria-label 보유라 동일 행번호 패턴 차용 (rowNumber prop 전달). 순수 additive (동작·스타일·시각 무변경, zero regression). 빌드 compiled · lint 0 problems.
- 2026-05-30 (23회차 · daily self-audit): `scripts/agent/daily-self-audit-prompt.md` 흐름 실행. git clean 확인. **QA**: dev server 200, Explore a11y 스윕 → net-positive gap 2건 발견 (tracking-paste textarea + ProductPicker SKU 검색 input, 둘 다 placeholder-only 접근성 이름 없음). **Security**: Supabase 보안 advisor 92건 중 b2b 관련 1건뿐 = b2b_marketwide_supplier_stats (#auto-C 의도 유지, 신규 0); 나머지 91건은 비-b2b main repo 테이블 (issue#7 P0 추적 중). 최근 8커밋 diff 전부 additive a11y aria-label — 신규 API route·RLS·secrets 0. **Code health**: lint 0 problems / build compiled (route 전체 생성). 발견 2건 모두 AUTO-RUN 범위 → P1 끝에 #auto-I 1개 항목으로 묶어 추가 (다음 cron 회차 fix 대기). issue 생성 0. commit: `chore(audit): 2026-05-30 self-audit — P1 +1 (#auto-I a11y 2건)`.
- 2026-05-30 (24회차): inbox polling 동일 (decision-needed 1 open=#7 — check-decision-reply decision=unknown, since=2026-05-28T00:37 = 우리 분석 댓글이 최신·user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments, 2026-05-27 이후 무변동) → Phase 0 blocked. **P1 pending 1건 (#auto-I) 처리** — 23회차 self-audit 가 큐에 넣은 a11y gap 2건 fix. commit a58f56c: `/orders/tracking-paste` 붙여넣기 textarea + `ProductPicker` SKU 검색 input 에 `aria-label` 추가 (placeholder 는 접근성 이름 대체 불가 → 스크린리더 필드 목적 인식 보강). 순수 additive (동작·스타일·시각 무변경, zero regression). 빌드 compiled · lint 0 problems. → P1 전건 다시 소진.
- 2026-05-30 (25회차): inbox polling 동일 (decision-needed 1 open=#7 — check-decision-reply decision=unknown, since=2026-05-28T00:37 = 우리 분석 댓글이 최신·user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments, 2026-05-27T07:37 이후 무변동) → Phase 0 blocked. P1 pending 0 (24회차 #auto-I 완료로 전건 소진) + #idea 후속 전건 소진. `npm run lint` 0 problems 재확인. 18~22·24회차 a11y 일관성 보강 대상이 소진되어, Explore 로 net-positive a11y gap 정밀 재탐색 → 신규 gap 0 (남은 form control·icon button 전부 accessible name 보유 확인). 독립 검증: `<img>` alt 누락 0건 / stray `console.log·console.debug` 0건. 명확한 net-positive AUTO-RUN 후보 부재 → 15~17회차와 동일하게 net-negative churn 회피 원칙 따라 강제 변경 없이 idle. commit: `chore(queue): P1 소진 — idle (25회차, a11y 스윕 소진·품질 점검 clean)`.
- 2026-05-30 (26회차): inbox polling — decision-needed 1 open=#7 (check-decision-reply decision=unknown, since=2026-05-28T00:37 = 우리 분석 댓글이 최신·user reply 미수신) / **idea 4 open 신규 (#12 매입 환율 스냅샷 / #13 배대지 정산 대조 / #14 보관기간 deadline 알림 / #15 부가세 분기·연간 프리셋, 모두 0 comments — brainstorm 05:00 가 어제 20:04 생성)** / handoff-from-main 0. 4 idea 모두 user approve 댓글 없음 → 2-b 규칙대로 그대로 open 유지 (큐 미추가, 사용자 결정 대기). main#3 여전히 open (0 comments) → Phase 0 blocked. P1 pending 0 + #idea 후속 전건 소진. `npm run lint` 0 problems 재확인. 25회차에서 a11y 스윕 소진 확인됨 → 이번엔 **다른 카테고리** (버그·empty/loading/error state·type safety) 로 Explore net-positive 탐색. 유일 후보 = `eta.ts:145 classifyEtaBucket` KST 타임존 불일치 주장이었으나 **검증 결과 false positive** — `todayKey`/`etaKey`(toKstDateKey) 와 `sundayKey`(kstToday 조작) 둘 다 동일 변환(+9h 후 UTC date 필드 read)이라 일관적이고, `setUTCDate` 월 오버플로 정상 처리. 실제 버그 아님. 명확한 net-positive 후보 부재 → 15~17·25회차 net-negative churn 회피 원칙 따라 강제 변경 없이 idle. commit: `chore(queue): P1 소진 — idle (26회차, idea 4 신규 user 결정 대기·eta 후보 false-positive 검증)`.
- 2026-05-30 (27회차): inbox polling 동일 (decision-needed 1 open=#7 — check-decision-reply decision=unknown, since=2026-05-28T00:37 = 우리 분석 댓글이 최신·user reply 미수신 / idea 4 open=#12~15 모두 0 comments·user approve 없음 → 2-b 규칙대로 open 유지·큐 미추가 / handoff-from-main 0). main#3 여전히 open → Phase 0 blocked. P1 pending 0 + #idea 후속 전건 소진. `npm run lint` 0 problems 재확인. 26회차의 eta·bug 탐색과 다른 fresh 카테고리(loading/error/empty-state 일관성·dead code)로 Explore net-positive 정밀 탐색 → **명확한 일관성 gap 1건 발견·수정** — commit 8939bd6. `/api/notifications` cursor 계산(`route.ts:63`)이 `pageItems[last].created_at` 직접 접근인데, **동일 패턴의 sibling `/refunds/page.tsx:126` 은 방어적 옵셔널 체이닝(`?.`) 사용** → 일관성 위해 `?. ?? null` 로 정렬. 양쪽 다 `hasMore` 가드로 현재 안전하나, sibling 의 방어 패턴에 맞춤 (순수 additive·런타임 동작 무변경·빈 배열 경로 현재 도달 불가, zero regression). 18~22회차 a11y 일관성 보강과 동일 flavor 의 안전한 net-positive. 빌드 compiled · lint 0 problems.
- 2026-05-30 (28회차): inbox polling — decision-needed 1 open=#7 (check-decision-reply decision=unknown, since=2026-05-28T00:37 = 우리 분석 댓글이 최신·user reply 미수신) / idea 4 open=#12~15 모두 0 comments·user approve 없음 → 2-b 규칙대로 open 유지·큐 미추가 / handoff-from-main 0. main#3 여전히 open (0 comments, 2026-05-27T07:37 이후 무변동) → Phase 0 blocked. P1 pending 0 + #idea 후속 전건 소진. `npm run lint` 0 problems 재확인. a11y 스윕 소진(25회차) 이후 27회차의 type-safety/consistency flavor 이어가 Explore net-positive 정밀 탐색 → API route `as any` 캐스트 제거 후보 발견. 검증: `b2b_notifications`·`b2b_accounts` 둘 다 types/supabase.ts 에 타입 존재 + select 컬럼 전건 Row 에 있음 확인 → typed client 직접 사용해도 build·lint 통과 보증. commit 42f8676: `/api/notifications/route.ts` 의 `const db = sb as any` 제거 (3 사용처 모두 `sb` 직접). `/api/orders`·`/api/refunds` 등 typed sibling 패턴에 정렬 — 동작·쿼리 무변경, 컴파일타임 테이블/컬럼명 오타 검출만 복원 (zero regression). 27회차 동일 파일(cursor 옵셔널 체이닝) 후속. 빌드 compiled · lint 0 problems. 잔여 동류 후보: forwarder-addresses·support/tickets·form-templates 등 다른 route 의 `as any` (각 회차 1건씩 검증 후 점진 제거 가능).
- 2026-05-30 (29회차): inbox polling — decision-needed 1 open=#7 (check-decision-reply decision=unknown, since=2026-05-28T00:37 = 우리 분석 댓글이 최신·user reply 미수신) / idea 4 open=#12~15 모두 0 comments·user approve 없음 → 2-b 규칙대로 open 유지·큐 미추가 / handoff-from-main 0. main#3 여전히 open (0 comments, 2026-05-27T07:37 이후 무변동) → Phase 0 blocked. P1 pending 0 + #idea 후속 전건 소진. 28회차가 남긴 type-safety 후속(다른 route `as any` 점진 제거) 1건 처리 — commit cc42742: `/api/notifications/read/route.ts` 의 `const db = sb as any` 제거 (3 사용처 모두 `sb` 직접). 검증: `b2b_accounts`·`b2b_notifications` 둘 다 types/supabase.ts 타입 보유 + 사용 컬럼(account_id/id/read_at/user_id) 전건 Row 존재 → typed client 직접 사용 build·lint 통과. 28회차 sibling `/api/notifications/route.ts` 와 동일 패턴, 동작·쿼리 무변경·컴파일타임 오타 검출 복원 (zero regression). 빌드 compiled · lint 0 problems. 잔여 동류 후보: forwarder-addresses·support/tickets·form-templates·seller-tokens·product-mappings 등 (각 회차 1건씩 검증 후 점진 제거).
- 2026-05-30 (30회차): inbox polling — **decision-needed #7 사용자 최종 답신 수신** (item 1·3·4·5=no 현상태유지 / **item 2=적용요청** password min_length=10+특수문자) → item 2 는 GoTrue Auth config 라 SQL/migration 경로 없고 Management API PAT 미보유 → MCP 적용 불가, issue#7 에 정확한 대시보드 단계 댓글 게시 + 사용자 토글 대기, item 1/3/4/5 는 현상태 유지 종결. **idea 4 open=#12~15 모두 user `approve` 댓글 수신** → 2-b 규칙대로 P1 큐에 4건 추가 + 각 issue 에 "✅ 큐 추가" 댓글. handoff-from-main 0. main#3 여전히 open → Phase 0 blocked. **P1 작업 1건 처리 = #idea-12 (매입 시점 환율 스냅샷 활성화)** commit 34eb623 — 주문 생성 시점 환율을 `b2b_orders.exchange_rate_applied` 에 고정(/api/orders·/api/orders/bulk), export-csv 가 주문별 스냅샷 우선·없으면 라이브 fallback + '환율 기준' 컬럼. DB 변경 0, 빌드 compiled·lint 0 problems. #idea-13/14/15 는 pending 으로 다음 회차 대기. issue#12 는 구현 완료라 commit 안내 후 close, #13/14/15 는 open 유지.
- 2026-05-30 (31회차): inbox polling — decision-needed #7 (check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기) / idea 1 open=#15 (30회차에 user approve·"✅ 큐 추가" 댓글 완료된 상태, 큐에 이미 P1 존재) / handoff-from-main 0. main#3 여전히 open → Phase 0 blocked. **P1 작업 1건 처리 = #idea-15 (부가세 CSV 합계 요약행)** commit c53a1e6 — 분기/연간 프리셋 버튼은 `/settings/compliance` 에 이미 존재 확인, 미구현이던 CSV 합계 요약행만 추가(통화별 소계 + 총 매입/판매/마진 KRW `■ 합계` 행, sparse row 헬퍼로 KRW 컬럼 정렬, X-Row-Count 는 데이터 행만). DB 변경 0, 빌드 compiled·lint 0 problems. → **P1 전건 소진**. issue#15 는 구현 완료라 commit 안내 후 close 예정.
- 2026-05-30 (32회차): inbox polling — decision-needed #7 (check-decision-reply decision=unknown, since=2026-05-30T00:42 = 우리 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → open 유지) / idea 0 / handoff-from-main 0. main#3 여전히 open (2026-05-27 이후 무변동) → Phase 0 blocked. P1 pending 0 → 18~21회차와 동일 원칙으로 명확한 net-positive a11y gap 1건 발견·수정 — commit 802bb57. `SellerShell` 상단 바 전역 주문 검색 input 이 placeholder 만 있고 aria-label/연결 label 없어 스크린리더가 "검색, edit text" 로만 읽던 것(placeholder 는 접근성 이름 대체 불가, 입력 시 사라짐) → `aria-label="주문 검색 (주문번호·구매자명·전화번호)"` + 장식 검색 svg `aria-hidden` 추가. 모든 인증 페이지 상단 고빈도 컨트롤. 순수 additive (동작·스타일·시각 무변경, zero regression). 빌드 compiled·lint 0 problems. (note: NotificationBell 알림 벨 버튼은 이미 aria-label/aria-expanded 보유 확인 — gap 아님.)
- 2026-05-30 (32회차): inbox polling — decision-needed #7 (check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기) / idea 0 open (#12~15 모두 30회차 처리·이후 close) / handoff-from-main 0. **main#3 (PH0-4 base page handoff) 에 user `apporve` 댓글 1건 (2026-05-30T00:08) 신규** — 단 main repo agent 가 구현·close 해야 Phase 0(#PH0-5/#PH0-6) unblock 되므로 여전히 state=open → 내 측에선 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진. `npm run lint` 0 problems 재확인. 28·29회차 type-safety thread 이어가 1건 처리 — commit 579c8b0: `/api/forwarder-addresses/route.ts` 의 `as any` 캐스트 4건 전건 제거 (`const db = sb as any` ×2 + `(admin as any)` ×2). 검증: b2b_forwarder_addresses·b2b_accounts·forwarders 모두 types/supabase.ts 타입 보유, FK 관계(`b2b_forwarder_addresses_forwarder_id_fkey`)도 Relationships 에 있어 `forwarders(name, slug)` embed 타입 해석됨, `createAdminClient()` 가 `SupabaseClient<Database>` 반환이라 admin insert/update 도 typed. 동작·쿼리 무변경, 컴파일타임 테이블/컬럼 오타 검출 복원 (zero regression). 빌드 compiled · lint 0 problems. 잔여 동류 후보: product-mappings·domestic-products·seller-tokens·support/tickets·form-templates 등 (각 회차 1건씩 검증 후 점진 제거).
- 2026-05-30 (33회차): inbox polling — decision-needed #7 (check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기) / idea 0 open / handoff-from-main 0. main#3 (PH0-4 base page handoff) state=open (1 comment = user approve, main repo agent 미구현·미close) → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진. 28·29·32회차 type-safety thread 이어가 1건 처리 — commit ff2b0ac: `/api/product-mappings/route.ts` 의 `const db = sb as any` (+ eslint-disable 주석) 제거. 검증: b2b_product_mappings·b2b_domestic_products·b2b_products·b2b_accounts 모두 types/supabase.ts 타입 보유 + 3 FK 관계(account_id/domestic_product_id/foreign_product_id fkey) Relationships 에 존재 → `b2b_domestic_products(...)`·`b2b_products(...)` embed 타입 해석됨, qb 재할당(.eq)·POST insert/single 모두 typed client 로 build·lint 통과. 동작·쿼리 무변경, 컴파일타임 테이블/컬럼 오타 검출 복원 (zero regression). 빌드 compiled · lint 0 problems. 잔여 동류 후보: product-mappings/[id]·domestic-products·seller-tokens·support/tickets·form-templates 등 (각 회차 1건씩 검증 후 점진 제거).
- 2026-05-30 (34회차): inbox polling — decision-needed #7 (check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기) / idea 0 open / handoff-from-main 0. main#3 (PH0-4 base page handoff) state=open (1 comment = user approve, main repo agent 미구현·미close) → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진. 28·29·32·33회차 type-safety thread 이어가 1건 처리 — commit a65153c: `/api/product-mappings/[id]/route.ts` 의 `const db = sb as any` (+ eslint-disable 주석) 제거. 검증: b2b_accounts(id/user_id)·b2b_product_mappings(id/account_id) 모두 types/supabase.ts 타입 보유 → DELETE 핸들러 select·delete 전건 typed client 로 build·lint 통과. 33회차 sibling `/api/product-mappings/route.ts` 와 동일 패턴, 동작·쿼리 무변경·컴파일타임 오타 검출 복원 (zero regression). 빌드 compiled · lint 0 problems. 잔여 동류 후보: domestic-products·domestic-products/[id]·seller-tokens·support/tickets·support/tickets/[id]/messages·form-templates 등 (각 회차 1건씩 검증 후 점진 제거).
- 2026-05-30 (35회차): inbox polling — decision-needed #7 (check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기) / idea 0 open / handoff-from-main 0. main#3 (PH0-4 base page handoff) state=open (user approve 댓글만, main repo agent 미구현·미close) → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). HEAD 가 큐 로그 너머로 진행됨 (UX Tier3 #18~22 = 별도 수기 작업, agent 회차 아님) 확인 — auto-queue P1 은 여전히 전건 소진. 28·29·32·33·34회차 type-safety thread 이어가 1건 처리 — commit 6e4298b: `/api/domestic-products/route.ts` 의 `const db = sb as any` (+ eslint-disable) 제거. 검증: b2b_domestic_products·b2b_accounts 모두 types/supabase.ts 타입 보유 + select(11컬럼)·insert(payload) 사용 컬럼 전건 Row/Insert 존재 → typed client 직접 사용 build·lint 통과. 34회차 sibling 패턴, 동작·쿼리 무변경·컴파일타임 오타 검출 복원 (zero regression). 빌드 compiled · lint 0 problems. 잔여 동류 후보: domestic-products/[id]·seller-tokens·support/tickets·support/tickets/[id]/messages·form-templates·verify-business 등 (각 회차 1건씩 검증 후 점진 제거).
- 2026-05-30 (36회차): inbox polling — decision-needed #7 (check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기) / idea 0 open / handoff-from-main 0. main#3 (PH0-4 base page handoff) state=open (1 comment=user approve, main repo agent 미구현·미close) → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진. 28·29·32·33·34·35회차 type-safety thread 이어가 1건 처리 — commit 0509c5f: `/api/domestic-products/[id]/route.ts` 의 `const db = sb as any` (+ eslint-disable) 제거. authAccount 가 typed `sb` 반환, PATCH 의 dynamic patch 를 `Database['public']['Tables']['b2b_domestic_products']['Update']` 타입으로 지정 (refunds/[id] 패턴). display_name 은 NOT NULL 이라 빈 값 시 400 가드 추가 (POST route 검증과 동일 — 기존엔 같은 400 을 DB NOT NULL 위반으로 반환, status·거부 동일·메시지만 명확화 → zero functional regression). 검증: b2b_accounts·b2b_domestic_products 모두 types/supabase.ts 타입 보유, PATCH 11컬럼·DELETE 모두 typed client 로 build·lint 통과. 35회차 sibling `/api/domestic-products/route.ts` 와 동일 패턴, 컴파일타임 테이블/컬럼 오타 검출 복원. 빌드 compiled · lint 0 problems. 잔여 동류 후보: seller-tokens·support/tickets·support/tickets/[id]/messages·form-templates·verify-business 등 (각 회차 1건씩 검증 후 점진 제거).
- 2026-05-29 (13회차): inbox polling 동일 (decision-needed 1 open=#7 — 우리 분석 댓글이 최신, user reply 미수신 / idea 0 / handoff-from-main 0). main#3 여전히 open (0 comments) → Phase 0 blocked. #idea 후속 전건 소진 상태라, 문서화된 미해결 tech-debt (#6 note) 1건 처리 — `/settings/compliance` 가 DB 미적용 스키마 참조로 런타임에 깨져 있던 것을 복구. commit 7cc0840: (1) Supabase MCP `apply_migration b2b_withdrawal_notices_and_account_columns` — `b2b_accounts.withdrawal_notice_enabled/custom_text` 2 컬럼 + `b2b_withdrawal_notices` 테이블 (b2b_schema.sql §23 authored 였으나 apply 누락분) + RLS owner-select (initplan 패턴) + (account_id, sent_at desc) 인덱스. (2) `b2b_schema.sql §23` 에 누락 컬럼·인덱스·initplan 패턴 동기 + 기록 SQL `supabase/b2b_2026_05_29_withdrawal_notices.sql`. (3) `types/supabase.ts` 재생성 (additive 64줄, b2b 외 churn 0). (4) route.ts 의 회피용 `as any` 3건 제거. 보안 advisor 신규 flag 0. 빌드 compiled / lint 0 problems. 효과: GET 404·PATCH 500 → 정상, 토글·커스텀 문구 영속. 미래: 주문 완료 시 실제 자동 발송 (RESEND_API_KEY 미등록=P2 #B 대기).
- 2026-05-30 (38회차): inbox polling 복구 (37회차 token 부재 → 이번엔 `.env.local` 정상 로드) — decision-needed 1 open=#7 (check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기) / idea 0 / handoff-from-main 0. main#3 (PH0-4 base page handoff) state=open (1 comment=user approve, main repo agent 미구현·미close) → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진. 28·29·32~37회차 type-safety thread 이어가 1건 처리 — commit 6461fa2: `/api/forwarder-addresses/[id]/route.ts` 의 `as any` 캐스트 9건 전건 제거 (`const db = sb as any` ×2 + `(admin as any)` ×7). 32회차 sibling `/api/forwarder-addresses/route.ts` 와 동일 패턴 완성. 검증: b2b_forwarder_addresses·b2b_accounts 모두 types/supabase.ts 타입 보유 + 사용 컬럼 전건 Row/Update 존재, createAdminClient() 가 `SupabaseClient<Database>` 반환이라 admin delete/update/select 모두 typed → tsc 0 errors·build compiled. PATCH 전체필드 patch 를 `Database['public']['Tables']['b2b_forwarder_addresses']['Update']` 타입으로 지정 (36회차 domestic-products/[id] 패턴). 동작·쿼리 무변경, 컴파일타임 테이블/컬럼 오타 검출 복원 (zero regression). 빌드 compiled · lint 0 problems. 잔여 동류 후보: form-templates·seller-tokens·support/tickets·extension/* 등 (각 회차 types 등록 여부 선검증 후 점진).
- 2026-05-31 (39회차): inbox polling 동일 (decision-needed #7 user `done` 토글 미수신 → open 대기 / idea 0 / handoff-from-main 0). main#3 (PH0-4) state=open → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진. 28·29·32~38회차 type-safety thread 이어가 1건 처리 — commit a4cfc66: `/api/support/tickets/route.ts` POST 의 `as any` 캐스트 4건(`const db = sb as any` + `(admin as any)` ×3) + eslint-disable 주석 4건 전건 제거. 검증: b2b_accounts·b2b_support_tickets·b2b_support_messages 모두 types/supabase.ts 타입 보유, createClient()/createAdminClient() 가 SupabaseClient<Database> 반환 → ticket insert/select/single·message insert·rollback delete 모두 typed. 동작·쿼리 무변경, 컴파일타임 테이블/컬럼 오타 검출 복원 (zero regression). tsc 0 errors · build compiled. 잔여 동류 후보: support/tickets/[id]/messages·seller-tokens·form-templates·extension/* 등 (각 회차 types 등록 여부 선검증 후 점진).
- 2026-05-31 (40회차): inbox polling 동일 (decision-needed #7 — check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기 / idea 0 / handoff-from-main 0). main#3 (PH0-4) state=open → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진. 28·29·32~39회차 type-safety thread 이어가 1건 처리 — commit 346f46a: `/api/support/tickets/[id]/messages/route.ts` POST 의 `as any` 캐스트 4건(`const db = sb as any` + `(admin as any)` ×3) + eslint-disable 주석 4건 전건 제거. 39회차 sibling `/api/support/tickets/route.ts` 와 동일 패턴 완성. 검증: b2b_accounts·b2b_support_tickets(account_id/status/last_message_at)·b2b_support_messages(ticket_id/sender/body) 모두 types/supabase.ts 타입 보유, createClient()/createAdminClient() 가 SupabaseClient<Database> 반환 → account select·ticket select/single·message insert·ticket update 모두 typed. 동작·쿼리 무변경, 컴파일타임 테이블/컬럼 오타 검출 복원 (zero regression). build compiled · lint 0 problems. 잔여 동류 후보: seller-tokens·form-templates·extension/* 등 (각 회차 types 등록 여부 선검증 후 점진).
- 2026-05-31 (41회차): inbox polling 동일 (decision-needed #7 — check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기 / idea 0 / handoff-from-main 0). main#3 (PH0-4) state=open (1 comment=user approve, main repo agent 미구현·미close) → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진. 28·29·32~40회차 type-safety thread 이어가 1건 처리 — commit e939d45: `/api/seller-tokens/route.ts` 의 `as any` 캐스트 4건(`const db = sb as any` ×2 + `(admin as any)` ×2) + eslint-disable 주석 4건 전건 제거. 검증: b2b_seller_tokens(account_id/label/token_hash/token_prefix/id/created_at/revoked_at 전건 Row/Insert/Update 보유)·b2b_accounts 모두 types/supabase.ts 타입 보유, createClient()/createAdminClient() 가 SupabaseClient<Database> 반환 → POST account select·token insert/select/single·DELETE account select·token revoke update 모두 typed. 동작·쿼리 무변경, 컴파일타임 테이블/컬럼 오타 검출 복원 (zero regression). build compiled · lint 0 problems. 잔여 동류 후보: form-templates(+[id]/columns/fork)·verify-business·extension/* 등 (각 회차 types 등록 여부 선검증 후 점진).
- 2026-05-31 (42회차): inbox polling 동일 (decision-needed #7 — check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기 / idea 0 / handoff-from-main 0). main#3 (PH0-4) state=open (1 comment=user approve, main repo agent 미구현·미close) → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진. 28·29·32~41회차 type-safety thread 이어가 1건 처리 — commit fc214c1: `/api/form-templates/route.ts` 의 `as any` 캐스트 4건(`const db = sb as any` ×2 GET·POST + `const adb = admin as any` ×2) + eslint-disable 주석 4건 제거. 검증: b2b_accounts·b2b_form_templates(source_file_size/header_row_count/combine_rule/data_start_row/owner_account_id 전건 Row/Insert 보유)·b2b_form_template_columns(column_letter/column_label/source_kind/user_input_label/required/column_index/template_id) 모두 types/supabase.ts 타입 보유, `b2b_form_templates_forwarder_id_fkey`→forwarders FK 가 Relationships 에 있어 `forwarders(name, slug)` embed 타입 해석됨, createAdminClient() 가 SupabaseClient<Database> 반환이라 admin select/insert/delete·`admin.storage` 모두 typed → GET 목록·POST 업로드 전건 typed client 로 build·lint 통과. 의도적 캐스트 1건(`xlsxBuffer as any` @ exceljs Buffer 호환, forwarder-export.ts 와 동일 사유)은 유지. 동작·쿼리 무변경, 컴파일타임 테이블/컬럼 오타 검출 복원 (zero regression). build compiled · lint 0 problems. 잔여 동류 후보: form-templates/[id](+columns/fork)·verify-business·extension/* 등 (각 회차 types 등록 여부 선검증 후 점진).
- 2026-05-30 (37회차): inbox polling — AGENT_GITHUB_TOKEN 부재(.env.local 빈 값)로 GitHub issue polling 이번 회차 생략. 정식 P1 pending 0 (전건 소진). 28·29·32~36회차 type-safety thread 이어가 1건 처리 — commit bce94f6: `/api/auth/mfa/enroll/route.ts` + `/api/auth/mfa/unenroll/route.ts` 의 `const db = createAdminClient() as any` (+ eslint-disable) 2건 제거. 검증: createAdminClient() 가 이미 `SupabaseClient<Database>` 반환, b2b_accounts(select id)·b2b_audit_log(insert account_id/user_id/action/target_type/target_id/metadata) 모두 types/supabase.ts 보유 → typed client 직접 사용 tsc 0 errors·build compiled. 동작·쿼리 무변경, 컴파일타임 오타 검출 복원 (zero regression). 잔여 동류 후보는 대부분 types 미등록 테이블/컬럼이라 캐스트가 정당 (account/delete=deleted_reason 미등록, support/tickets·seller-tokens·form-templates·extension/* 등) — 각 회차 types 등록 여부 선검증 후 점진. b2b_auto_runs row 15d8e790 insert 완료.
- 2026-05-31 (44회차): inbox polling 동일 (decision-needed #7 — check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기 / idea 0 / handoff-from-main 0). main#3 (PH0-4) state=open → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). **P1 pending 1건 (#auto-J) 처리** — 43회차 daily self-audit 가 큐에 넣은 버그 fix. commit eb41b3d: `NotificationBell.handleClick` 의 read-mark fetch `.then(() => refresh())` 에 `.catch(() => {})` 추가 — `.catch()` 없는 fire-and-forget 이라 네트워크 실패 시 unhandled promise rejection 발생하던 것 제거. sibling `markAllRead` (try/finally) 와 비대칭이던 것 정렬. fire-and-forget 동작·router.push 무지연 유지 (16회차의 `await` 보류 결정과 무관한 순수 additive 하드닝, zero regression). 빌드 compiled · lint 0 problems. → P1 전건 다시 소진.
- 2026-05-31 (45회차): inbox polling 동일 (decision-needed #7 — check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기 / idea 0 / handoff-from-main 0). main#3 (PH0-4) state=open (1 comment=user approve, main repo agent 미구현·미close) → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진. 28·29·32~42회차 type-safety thread 이어가 1건 처리 — commit 31c0298: `/api/form-templates/[id]/route.ts` 의 `const adb = admin as any` (+ eslint-disable) 제거. 검증: b2b_accounts·b2b_form_templates(owner_account_id/source_file_path/data_start_row/combine_rule/is_active 전건 Row/Update 보유) 모두 types/supabase.ts 타입 보유, createAdminClient() 가 SupabaseClient<Database> 반환 → getOwnedTemplate 의 account/template select·PATCH update·DELETE delete·`adb.storage` 모두 typed. PATCH 의 dynamic patch 를 `Database['public']['Tables']['b2b_form_templates']['Update']` 타입으로 지정 (36회차 domestic-products/[id] 패턴). 동작·쿼리 무변경, 컴파일타임 테이블/컬럼 오타 검출 복원 (zero regression). build compiled · lint 0 problems. 잔여 동류 후보: form-templates/[id]/columns·fork·verify-business·extension/* 등 (각 회차 types 등록 여부 선검증 후 점진).
- 2026-05-31 (46회차): inbox polling 동일 (decision-needed #7 — check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기 / idea 4 open=#16~19 댓글 0·생성 2026-05-30 24h 미경과 → 그대로 open / handoff-from-main 0). main#3 (PH0-4) state=open (1 comment=user approve, main repo agent 미구현·미close) → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진. 28·29·32~42·45회차 type-safety thread 이어가 1건 처리 — commit 701535f: `/api/form-templates/[id]/columns/route.ts` 의 `const adb = admin as any` (+ eslint-disable) 제거. 45회차 sibling `/api/form-templates/[id]/route.ts` 와 동일 subtree 완성. 검증: b2b_accounts·b2b_form_templates·b2b_form_template_columns(column_index/column_label/source_kind/source_path/composite_template/constant_value/user_input_label/user_input_options/transform/required/template_id 전건 Row/Insert/Update 보유) 모두 types/supabase.ts 타입 보유, createAdminClient() 가 SupabaseClient<Database> 반환 → account/tpl/existing select·컬럼 update·insert 모두 typed. patch 는 명시 Update 어노테이션 대신 추론 리터럴 타입으로 둠 (Update·Insert 양쪽 대입 가능, column_label `?? ''` 로 검증 후 required string 보장 — 검증 루프가 비어 있지 않은 string 보장하므로 ?? 분기는 미발생). 불필요해진 `existing` cast·`Array<...>` 어노테이션도 제거. 동작·쿼리 무변경, 컴파일타임 테이블/컬럼 오타 검출 복원 (zero regression). build compiled · lint 0 problems. 잔여 동류 후보: form-templates/[id]/fork·verify-business·extension/* 등 (각 회차 types 등록 여부 선검증 후 점진).
- 2026-05-31 (52회차): inbox polling — decision-needed #7 (check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기) / **idea 4 open=#16~19 모두 user `approve` 댓글 수신 (2026-05-31T02:29~02:31)** → 2-b 규칙대로 P1 큐에 4건 추가 + 각 issue 에 "✅ 큐 추가" 댓글 게시·open 유지 / handoff-from-main 0. main#3 (PH0-4) state=open → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). 직전 회차(51회차 이전) 미커밋 brainstorm-prompt 디자인 렌즈 변경은 7c010f4 로 이미 정리됨 확인. **P1 작업 1건 처리 = #idea-16 (주문 1-click 복제·재주문)** commit 60aa714 — `/orders/[id]` 액션에 복제 버튼 → `/orders/new?duplicate=<id>` query param, new/page.tsx 가 소유 주문 fetch 후 `DuplicateSource` 구성, NewOrderForm `duplicateFrom` prop 으로 구매자 PII·배대지·상품 라인 prefill (마켓 주문번호·매입 주문번호·운송장은 비움, 주문번호·주문일 새 발급). SKU label b2b_products 별도 조회. DB 변경 0, 빌드 compiled·lint 0 problems. #idea-17/18/19 는 pending 으로 다음 회차 대기. issue#16 은 구현 완료라 commit 안내 후 close 예정 (#17~19 는 open 유지).
- 2026-05-31 (47회차): inbox polling 동일 (decision-needed #7 — check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기 / idea 4 open=#16~19 댓글 0·user approve 없음 → 2-b 규칙대로 open 유지·큐 미추가 / handoff-from-main 0). main#3 (PH0-4) state=open (1 comment=user approve, main repo agent 미구현·미close) → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진. 28·29·32~42·45·46회차 type-safety thread 이어가 1건 처리 — commit a921f51: `/api/form-templates/[id]/fork/route.ts` 의 `const adb = admin as any` (+ eslint-disable) 제거. 45·46회차 form-templates/[id] subtree 완성. 검증: b2b_accounts(id/user_id)·b2b_form_templates(owner_account_id/forwarder_id/name/source_file_path/source_file_size/data_sheet_name/data_start_row/header_row_count/combine_rule/is_active 전건 Row/Insert 보유)·b2b_form_template_columns(column_index/column_letter/column_label/source_kind/source_path/composite_template/constant_value/user_input_label/user_input_options/transform/required/notes/template_id 전건 Row/Insert 보유) 모두 types/supabase.ts 타입 보유, createAdminClient() 가 SupabaseClient<Database> 반환 → account/원본 template select·storage download/upload/remove·새 template insert·컬럼 insert·롤백 delete 모두 typed. `srcCols as ColRow[]`·`fileBlob as Blob` 는 PostgREST 동적 select 행·Storage Blob 좁히기용 정당 캐스트라 유지. 동작·쿼리 무변경, 컴파일타임 테이블/컬럼 오타 검출 복원 (zero regression). build compiled · lint 0 problems. 잔여 동류 후보: verify-business·extension/{forwarder-addresses,orders,form-snapshot,addresses} 등 (account/delete 의 deleted_reason 미등록 캐스트는 37회차 결론대로 정당·유지; 각 회차 types 등록 여부 선검증 후 점진).
 - 2026-05-31 (56회차): inbox polling — decision-needed #7 (check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기) / idea 0 open / handoff-from-main 0. main#3 (PH0-4) state=open → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 (#idea-16~19 52~55회차 전건 소진) + #idea 후속 전건 소진 → 18~20회차 원칙대로 명확한 net-positive 하드닝 1건 처리 — commit 983f437: settings/cards/PaymentCardsManager.tsx 의 toggleActive/remove 가 await fetch 를 try/catch 없이 호출해 네트워크 실패 시 onClick 핸들러에서 unhandled promise rejection 발생하던 것 제거 (#auto-J NotificationBell 과 동일 비대칭 — sibling onSubmit/reload 은 이미 try/catch 가드). 각 함수를 try/catch 로 감싸 네트워크 예외 시 alert 안내, happy-path·HTTP-error(!res.ok) 경로 동작 무변경, remove 의 기존 alert 관용구와 정렬 (zero regression, 순수 additive). build compiled · lint 0 problems.
 - 2026-05-31 (57회차): inbox polling — decision-needed #7 (check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기) / idea 0 open / handoff-from-main 0. main#3 (PH0-4) state=open (1 comment=user approve, main repo agent 미구현·미close) → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진 → 28·29·32~42·45~47회차 type-safety thread 이어가 1건 처리 — commit d896cc7: `/api/extension/addresses/route.ts` 의 `(admin as any)` 캐스트 2건(목록 쿼리 + 셀러 fallback 쿼리) + eslint-disable 주석 1건 제거. 검증: b2b_forwarder_addresses(전 컬럼 Row 보유 + `b2b_forwarder_addresses_forwarder_id_fkey`→forwarders·`_account_id_fkey`→b2b_accounts FK 가 Relationships 에 정의되어 `forwarders(name, slug)` embed 타입 해석됨)·b2b_accounts(phone/business_name) 모두 types/supabase.ts 타입 보유, createAdminClient() 가 SupabaseClient<Database> 반환 → 조건부 `.or()`/`.eq(country)` 필터 빌더 재대입·정렬·셀러 single select 모두 typed. 동작·쿼리 무변경, 컴파일타임 테이블/컬럼 오타 검출 복원 (zero regression). build compiled · lint 0 problems. 잔여 동류 후보: extension/{forwarder-addresses,orders,form-snapshot} 는 49~51회차에 이미 처리됨 — 남은 `as any` 는 account/delete(deleted_reason 미등록, 37회차 결론대로 정당)·form-templates(xlsxBuffer exceljs 호환, 정당) 뿐이라 **API route type-safety thread 사실상 완료** (정당 캐스트만 잔존).
 - 2026-05-31 (58회차): inbox polling — decision-needed #7 (check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기) / idea 0 open / handoff-from-main 0. main#3 (PH0-4) state=open (1 comment=user approve, main repo agent 미구현·미close) → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진. 57회차에서 **API route** type-safety thread 가 사실상 완료(정당 캐스트만 잔존)됨에 따라, 동일 thread 를 **페이지/클라이언트 컴포넌트** 로 확장 — commit c76b812: `src/app/suspended/page.tsx` 의 `(supabase as any)` 캐스트 + eslint-disable 주석 제거. 검증: `createClient()`(`@/lib/auth/client`)가 `createBrowserClient<Database>` 반환 + `b2b_accounts` Row 에 `verification_status`/`suspended_reason` 둘 다 존재 → typed client 직접 사용해도 build·lint 통과 보증. 동작·쿼리 무변경, 컴파일타임 테이블/컬럼 오타 검출 복원 (zero regression). build compiled · lint 0 problems. 잔여 동류 후보(페이지): signup/step-2·step-5, templates·support·clients·analytics·notifications·dashboard·layout 의 `const db = sb as any` (각 회차 1건씩 검증 후 점진 제거).
 - 2026-05-31 (59회차): inbox polling — decision-needed #7 (check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기) / idea 0 open / handoff-from-main 0. main#3 (PH0-4) state=open (1 comment=user approve, main repo agent 미구현·미close) → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진. 58회차 페이지 type-safety thread 이어가 1건 처리 — commit 23a63bf: `src/app/(app)/notifications/page.tsx` 의 `const db = sb as any`(+ eslint-disable) 제거. 검증: `createClient()`(`@/lib/auth/server`)가 `createServerClient<Database>` 반환 + `b2b_accounts`·`b2b_notifications` 둘 다 types/supabase.ts 타입 보유 + select 컬럼(id/type/title/body/link/read_at/created_at) 전건 Row 존재 → 3 사용처 모두 `sb` 직접 사용해도 build·lint 통과. 동작·쿼리 무변경, 컴파일타임 테이블/컬럼 오타 검출 복원 (zero regression). build compiled · lint 0 problems. 잔여 동류 후보(페이지): signup/step-2·step-5, templates·support·clients·analytics·dashboard·layout 의 `const db = sb as any` / `(supabase as any)` (각 회차 1건씩 검증 후 점진 제거).
 - 2026-05-31 (60회차): inbox polling — decision-needed #7 (check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기) / idea 0 open / handoff-from-main 0. main#3 (PH0-4) state=open (1 comment=user approve, main repo agent 미구현·미close) → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진. 59회차 페이지 type-safety thread 이어가 1건 처리 — commit 5af67c2: `src/app/(app)/clients/page.tsx` 의 `const db = sb as any`(b2b_accounts 조회) + `(admin as any)`(b2b_orders 조회) 캐스트 2건 + eslint-disable 2건 제거. 검증: `createClient()`(`@/lib/auth/server`)=`createServerClient<Database>` / `createAdminClient()`=`SupabaseClient<Database>` + `b2b_accounts`(id/business_name)·`b2b_orders`(buyer_address 등 전 컬럼) 타입 보유 + 임베드 `b2b_order_items(sale_price_krw)` 가 `b2b_order_items_order_id_fkey`→b2b_orders Relationships 로 타입 해석 (sale_price_krw Row 존재) → 두 쿼리 모두 typed client 직접 사용해도 build·lint 통과. `OrderRow[]` 수동 타입은 typed 결과의 widening 이라 할당 호환. 동작·쿼리 무변경, 컴파일타임 오타 검출 복원 (zero regression). build compiled · lint 0 problems. 잔여 동류 후보(페이지): signup/step-2·step-5, templates·support·analytics·dashboard·layout 의 `const db = sb as any` / `(supabase as any)` (각 회차 1건씩 검증 후 점진 제거).
 - 2026-05-31 (61회차): inbox polling — decision-needed #7 (check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기) / idea 0 open / handoff-from-main 0. main#3 (PH0-4) state=open (1 comment=user approve, main repo agent 미구현·미close) → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진. 60회차 페이지 type-safety thread 이어가 1건 처리 — commit 966f681: `src/app/(app)/templates/page.tsx` 의 `const db = sb as any`(b2b_accounts 조회) + `const adb = admin as any`(b2b_form_templates·forwarders 조회) 캐스트 2건 + eslint-disable 2건 제거. 검증: `createClient()`=`createServerClient<Database>` / `createAdminClient()`=`SupabaseClient<Database>` + `b2b_accounts`(id/business_name)·`b2b_form_templates`(전 컬럼+임베드 `forwarders(name,slug)`)·`forwarders`(id/name) 모두 types/supabase.ts 보유 → typed client 직접 사용해도 build·lint 통과. `TemplateRow[]`·`Forwarder[]` 수동 캐스트는 typed 결과의 widening 이라 호환. 동작·쿼리 무변경, 컴파일타임 오타 검출 복원 (zero regression). build compiled 4.0s · lint 0 problems. 잔여 동류 후보: signup/step-2·step-5, templates/[id]·support·analytics·dashboard·layout (각 회차 1건씩 점진 제거).
 - 2026-05-31 (62회차): inbox polling — decision-needed #7 (check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기) / idea 0 open / handoff-from-main 0. main#3 (PH0-4) state=open → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진. 61회차 페이지 type-safety thread 이어가 1건 처리 — commit 5955e5b: `src/app/(app)/templates/[id]/page.tsx` 의 `const db = sb as any`(b2b_accounts·b2b_orders 조회) + `const adb = admin as any`(b2b_form_templates·b2b_form_template_columns·forwarders 조회) 캐스트 2건 + eslint-disable 2건 제거 (db/adb 별칭 제거 후 sb 직접 사용 + createAdminClient() 결과 직접 adb 할당). 검증: `createClient()`=`createServerClient<Database>` / `createAdminClient()`=`SupabaseClient<Database>` + 사용 테이블 전건 types/supabase.ts 보유 — b2b_accounts(id/business_name/phone)·b2b_form_templates(전 컬럼+임베드 `forwarders(name,slug)`)·b2b_form_template_columns(매핑 컬럼 전건)·forwarders(id/name)·b2b_orders(전 컬럼+임베드 `b2b_order_items(...)`). 임베드 FK 가 Relationships 에 정의되어 타입 해석됨 (42·45·46·60·61회차에서 동일 테이블 검증 완료). `as { data: TplRow|null }`·`EditorColumn[]`·`EditorForwarder[]`·`SampleOrder` 수동 캐스트는 typed 결과 widening 이라 호환. 동작·쿼리 무변경, 컴파일타임 오타 검출 복원 (zero regression). build compiled 4.1s · lint 0 problems. 잔여 동류 후보: signup/step-2·step-5, support(+[id])·analytics·dashboard·layout (각 회차 1건씩 점진 제거).
 - 2026-05-31 (63회차): inbox polling — decision-needed #7 (check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기) / idea 0 open / handoff-from-main 0. main#3 (PH0-4) state=open (user approve 댓글만, main repo agent 미구현·미close) → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진. 61·62회차 페이지 type-safety thread 이어가 1건 처리 — commit 1494971: `src/app/(app)/layout.tsx` (전 인증 페이지 공통 SellerAppLayout) 의 `(supabase as any)`(b2b_accounts+임베드 조회) + `(rawAccount as any)`(planCode 추출) 캐스트 2건 + eslint-disable 2건 제거. 검증: `createClient()`=`createServerClient<Database>` + b2b_accounts(id/email/business_name/verification_level/verification_status/suspended_at) 전건 types/supabase.ts 보유 + 임베드 `b2b_subscriptions(b2b_subscription_plans(plan_code))` 가 b2b_subscriptions→b2b_accounts(account_id, isOneToOne) / b2b_subscriptions→b2b_subscription_plans(plan_id) FK 로 타입 해석됨. planCode 추출은 pricing/page.tsx 의 canonical Array.isArray 가드 패턴 복제 (typed 결과가 object/array 어느 쪽이든 안전 · 런타임 동일). account=SellerAccount 캐스트는 typed row 가 SellerAccount 의 superset 이라 호환. 동작·쿼리 무변경, 컴파일타임 오타 검출 복원 (zero regression). build compiled · lint 0 problems. 잔여 동류 후보: signup/step-2·step-5, support(+[id])·analytics·dashboard (각 회차 1건씩 점진 제거).
 - 2026-05-31 (64회차): inbox polling — decision-needed #7 (check-decision-reply decision=unknown, since=2026-05-30T00:42 = 30회차 대시보드 단계 안내 댓글이 최신·user `done` 토글 미수신 → 그대로 open 대기) / idea 0 open / handoff-from-main 0. main#3 (PH0-4) state=open → Phase 0(#PH0-5/#PH0-6) 계속 blocked (main agent 책임). P1 pending 0 + #idea 후속 전건 소진. 58~63회차 페이지 type-safety thread 이어가 1건 처리 — commit 2c1eb87: `src/app/(app)/analytics/page.tsx` 의 `const db = sb as any`(b2b_accounts·b2b_orders·rpc 조회) + eslint-disable 1건 제거 (db 별칭 제거 후 sb 직접 사용). 검증: `createClient()`=`createServerClient<Database>` + b2b_accounts(id/user_id)·b2b_orders(id/created_at/account_id/deleted_at + 임베드 `b2b_order_items(product_id/product_name/quantity/currency/unit_price_foreign/sale_price_krw/supplier_site)` via `b2b_order_items_order_id_fkey`) 타입 보유 + **RPC `b2b_marketwide_supplier_stats` 가 types/supabase.ts Functions 에 `Args: { p_min_lines?: number }` / `Returns: {avg_qty,avg_sale_krw,line_count,median_sale_krw,supplier_site}[]` 로 등록** → `sb.rpc('b2b_marketwide_supplier_stats', { p_min_lines: 20 })` typed. `OrderRow[]`·`mw as MarketStat[] | null` 수동 캐스트는 typed 결과 widening/동일 shape 이라 호환·유지. 동작·쿼리 무변경, 컴파일타임 오타 검출 복원 (zero regression). build compiled · lint 0 problems. 잔여 동류 후보: signup/step-2·step-5, support(+[id])·dashboard (각 회차 1건씩 점진 제거).
 - 2026-06-01 (69회차): inbox polling — AGENT_GITHUB_TOKEN 미설정(.env.local 빈 값)으로 GitHub issue polling 이번 회차 생략. main#3(PH0-4)·#PH0-5/6 핸드오프는 토큰 필요라 보류. P1 pending 0 + #idea 후속 전건 소진 → P1.5 idle 풀 #idle-5(중복 유틸 통합) 1건 처리 — commit 1c33b9e: support/page·support/[id]/page·notifications/NotificationList 의 byte-identical 복붙 로컬 formatDate(YY.MM.DD HH:MM) 를 format.ts 새 export formatDateTimeShort 로 통합(동일 구현 그대로 이동 → 출력 무변경, 호출부는 `formatDateTimeShort as formatDate` alias 유지). shared formatDate(YYYY. M. D.)/formatDateTime 과 포맷 달라 별도 함수 추가. net -16 lines, build·lint 0 problems. 잔여 동류: settlement/refunds 의 ₩-prefix formatKRW·eta/clients/imports 페이지 전용 fmtDate 는 출력 규칙 달라 통합 시 UI 변경 발생 → 미통합 유지.
 - 2026-06-01 (70회차): **변경 없음 (idle)**. AGENT_GITHUB_TOKEN 이 이번 회차엔 정상(.env.local) → inbox polling 재개: `agent-decision-needed` issue#7 답신 변화 없음(이미 처리, 대시보드 토글 대기) / `agent-idea` #20~24 무답·생성 <24h → open 유지(큐 미추가) / `agent-handoff-from-main` 0. P1 brainstorm 전건 done. P1.5 풀에서 `formatKRW` 통합을 재검토했으나 69회차가 이미 결론낸 그대로 — 공용 `src/lib/b2b/format.ts` formatKRW 는 `12,345원`(원 접미, round 없음)인데 페이지 로컬(analytics/clients/imports[id]/recommendations/settlement)은 `₩12,345`(₩ 접두, 일부만 Math.round)라 통합 시 화면 표기·반올림이 바뀜(시각 회귀). 통화 표기 통일(₩ vs 원)은 디자인 결정이라 idle auto-run 범위 밖 → 억지 변경 금지로 skip. (주의: 이번 회차 초반 환경이 존재하지 않는 파일 내용 src/lib/format.ts·SettlementClient.tsx·OrderDetailClient.tsx 을 환각 제공 → git show 교차검증 후 정정, 잘못된 edit 은 전부 실패해 무영향.)
