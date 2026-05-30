-- 2026-05-30 셀러 환경설정 (계정 단위, 기기 간 동기화)
-- Supabase MCP apply_migration `b2b_accounts_seller_preferences` 로 적용됨.
-- free_storage_days   : 배대지 무료 보관일 (null=기본 7), 1~60      — UX #20 보관비 경고
-- automatch_threshold : 영수증 자동 매칭 안전 임계값 (null=기본 90), 70~95 — UX #17
-- 이전: free_storage_days=쿠키, automatch_threshold=localStorage (브라우저별) → 계정 컬럼으로 승격.

alter table public.b2b_accounts
  add column if not exists free_storage_days int,
  add column if not exists automatch_threshold int;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'b2b_accounts_free_storage_days_check') then
    alter table public.b2b_accounts
      add constraint b2b_accounts_free_storage_days_check
      check (free_storage_days is null or (free_storage_days between 1 and 60));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'b2b_accounts_automatch_threshold_check') then
    alter table public.b2b_accounts
      add constraint b2b_accounts_automatch_threshold_check
      check (automatch_threshold is null or (automatch_threshold between 70 and 95));
  end if;
end $$;

comment on column public.b2b_accounts.free_storage_days is '배대지 무료 보관일 (null=기본 7). #20 보관비 경고';
comment on column public.b2b_accounts.automatch_threshold is '영수증 자동 매칭 안전 임계값 (null=기본 90). #17';
