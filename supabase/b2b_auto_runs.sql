-- B2B 자율 빌드 cron tick 결과 기록
-- 2026-05-14
-- cron(`scripts/b2b-auto-build.sh`) 이 매 30분 tick 끝에 1행 insert.
-- /admin/b2b-auto-runs 에서 조회.

create table if not exists public.b2b_auto_runs (
  id uuid primary key default gen_random_uuid(),
  tick_at timestamptz not null default now(),
  duration_seconds int,
  mode text not null,                    -- 'implementation' | 'refine' | 'skip' | 'error' | 'init'
  task_picked text,                      -- TODO 항목 텍스트 (parsing 가능 시)
  task_status text,                      -- 'completed' | 'blocked' | 'error' | null
  commit_hash text,                      -- worktree 의 auto/b2b-evolution HEAD
  commit_message text,
  files_changed jsonb,                   -- ['path/to/file', ...]
  output_summary text,                   -- claude 출력 전체 (~수백자)
  error_message text,
  created_at timestamptz not null default now(),
  constraint b2b_auto_runs_mode_check
    check (mode in ('implementation','refine','skip','error','init','dry'))
);

create index if not exists idx_b2b_auto_runs_time
  on public.b2b_auto_runs(tick_at desc);

create index if not exists idx_b2b_auto_runs_mode
  on public.b2b_auto_runs(mode, tick_at desc);

-- RLS: admin only via service_role
alter table public.b2b_auto_runs enable row level security;
-- service_role 은 BYPASSRLS 권한 → cron INSERT/UPDATE 가능.
-- authenticated 중 admin email 만 SELECT 가능 (anseunghyok@gmail.com).
-- 추가 admin 필요 시 OR 조건 확장 또는 b2b_admins 테이블 도입.
-- 2026-05-28 #auto-D: rls_enabled_no_policy 경고 해소 + admin direct read 대비.

drop policy if exists "b2b_auto_runs_admin_select" on public.b2b_auto_runs;
create policy "b2b_auto_runs_admin_select" on public.b2b_auto_runs
  for select
  to authenticated
  using (
    (auth.jwt() ->> 'email')::text = 'anseunghyok@gmail.com'
  );
