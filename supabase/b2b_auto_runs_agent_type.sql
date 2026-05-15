-- 3 에이전트 분리 — agent_type 컬럼
-- 2026-05-15

alter table public.b2b_auto_runs
  add column if not exists agent_type text;

-- 기존 row 는 모두 builder 로
update public.b2b_auto_runs
  set agent_type = 'builder'
  where agent_type is null;

create index if not exists idx_b2b_auto_runs_agent_type
  on public.b2b_auto_runs(agent_type, tick_at desc);

alter table public.b2b_auto_runs
  drop constraint if exists b2b_auto_runs_agent_type_check;
alter table public.b2b_auto_runs
  add constraint b2b_auto_runs_agent_type_check
    check (agent_type in ('discovery','builder','review'));
