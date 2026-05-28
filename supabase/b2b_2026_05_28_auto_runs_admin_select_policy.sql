-- b2b_auto_runs: admin SELECT policy 추가
-- 2026-05-28 #auto-D (audit 발견)
-- Supabase MCP apply_migration `b2b_auto_runs_admin_select_policy` 로 적용 완료.
--
-- 배경:
--   - 현재 RLS enabled 인데 policy 0 건 → service_role 만 접근 (의도된 동작).
--   - Supabase advisor `rls_enabled_no_policy` 경고 (severity: medium).
--   - 향후 admin user 가 직접 authenticated 토큰으로 read 할 가능성 대비.
--
-- 동작:
--   - authenticated role 중 JWT email 이 admin (anseunghyok@gmail.com) 인 경우만 SELECT.
--   - INSERT/UPDATE/DELETE 정책 없음 → 기본 deny.
--   - service_role 은 BYPASSRLS 권한 → cron 의 INSERT 동작 그대로 유지.
--
-- 추가 admin 필요 시:
--   - 단기: OR 조건으로 USING 절 확장
--   - 장기: b2b_admins(email) 테이블 도입 후 IN (SELECT email FROM b2b_admins) 패턴

drop policy if exists "b2b_auto_runs_admin_select" on public.b2b_auto_runs;

create policy "b2b_auto_runs_admin_select" on public.b2b_auto_runs
  for select
  to authenticated
  using (
    (auth.jwt() ->> 'email')::text = 'anseunghyok@gmail.com'
  );

comment on policy "b2b_auto_runs_admin_select" on public.b2b_auto_runs is
  'admin (anseunghyok@gmail.com) only direct SELECT. service_role bypasses RLS for cron INSERTs. 추가 admin 필요 시 OR 조건 또는 b2b_admins 테이블 도입.';
