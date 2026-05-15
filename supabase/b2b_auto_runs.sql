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
-- anon · authenticated 모두 read 정책 없음 → service_role 만 접근
