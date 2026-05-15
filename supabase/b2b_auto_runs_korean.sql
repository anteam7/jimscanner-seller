-- B2B 자율 빌드 cron 결과에 한글 구조화 요약 컬럼 추가
-- 2026-05-15

alter table public.b2b_auto_runs
  add column if not exists selection_reason text,    -- 왜 이 작업을 골랐는가
  add column if not exists change_summary text,      -- 어떻게 개선했는가 (본문)
  add column if not exists next_direction text;      -- 다음에 어디로 향하는가
