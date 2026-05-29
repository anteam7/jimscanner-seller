-- ─────────────────────────────────────────────
-- b2b_seller_transit_overrides — 셀러별 운송일수 보정 (#idea-5 후속)
-- 생성: 2026-05-29
-- 참조: github issue#5 (brainstorm approved 2026-05-27) "셀러별 transit 평균 override"
-- ─────────────────────────────────────────────
-- b2b_forwarder_transit_defaults 는 서비스 공통 시드값.
-- 셀러가 실제 경험상 더 빠르거나 느린 배대지·국가를 쓰면 본인 기준으로 보정.
-- ETA 계산(/eta, ICS export)에서 같은 (origin_country, method) 키가 있으면
-- 글로벌 시드 대신 이 override 가 우선 적용된다.
-- ─────────────────────────────────────────────

create table if not exists public.b2b_seller_transit_overrides (
  account_id uuid not null references public.b2b_accounts(id) on delete cascade,
  origin_country text not null,                          -- 시드 canonical 코드 (US/JP/UK/OTHER ...)
  method text not null default 'air',                    -- air | boat | express | ems ...
  avg_transit_days integer not null check (avg_transit_days between 1 and 120),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (account_id, origin_country, method)
);

create index if not exists idx_b2b_seller_transit_overrides_account
  on public.b2b_seller_transit_overrides(account_id);

-- updated_at 자동 트리거 (공통 함수 재사용)
drop trigger if exists tg_b2b_seller_transit_overrides_touch on public.b2b_seller_transit_overrides;
create trigger tg_b2b_seller_transit_overrides_touch
  before update on public.b2b_seller_transit_overrides
  for each row execute function public.tg_b2b_touch_updated_at();

-- RLS — 본인 계정 데이터만 (initplan 최적화 패턴: (select auth.uid()))
alter table public.b2b_seller_transit_overrides enable row level security;

drop policy if exists "b2b_seller_transit_overrides tenant rw" on public.b2b_seller_transit_overrides;
create policy "b2b_seller_transit_overrides tenant rw"
  on public.b2b_seller_transit_overrides for all
  to public
  using (
    account_id in (
      select id from public.b2b_accounts
      where user_id = (select auth.uid())
    )
  )
  with check (
    account_id in (
      select id from public.b2b_accounts
      where user_id = (select auth.uid())
    )
  );

comment on table public.b2b_seller_transit_overrides is
  '셀러별 운송일수 보정. (origin_country, method) 단위로 글로벌 transit 시드를 덮어씀. ETA 계산 우선 적용. (#idea-5 후속, 2026-05-29)';
