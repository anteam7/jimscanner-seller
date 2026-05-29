-- 2026-05-29 청약철회 고지 (전자상거래법 §17) 스키마 적용
--
-- 배경: src/app/api/settings/compliance/route.ts + (app)/settings/compliance/page.tsx 가
-- b2b_accounts.withdrawal_notice_enabled / withdrawal_notice_custom_text 컬럼과
-- b2b_withdrawal_notices 테이블을 참조하나, DB 에 미적용이라 /settings/compliance 가
-- 런타임에서 깨져 있었음 (GET 404 / PATCH 500). route.ts 는 회피용 `as any` 캐스트 유지 중.
--
-- b2b_withdrawal_notices 테이블 정의는 b2b_schema.sql §23 에 authored 돼 있었으나 apply 누락.
-- b2b_accounts 2개 컬럼은 어디에도 authored 안 돼 있었음 → 이번에 §23 에 동기.
--
-- 이 파일은 Supabase MCP apply_migration 'b2b_withdrawal_notices_and_account_columns' 와 동일.
-- RLS owner-select 는 initplan 패턴 (select auth.uid()) 사용 (#auto-E 일관).

-- 1) b2b_accounts 설정 컬럼 2개
alter table public.b2b_accounts
  add column if not exists withdrawal_notice_enabled boolean not null default true;
alter table public.b2b_accounts
  add column if not exists withdrawal_notice_custom_text text;

-- 2) 고지 발송 기록 테이블
create table if not exists public.b2b_withdrawal_notices (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null references public.b2b_accounts(id) on delete cascade,
  order_id          uuid not null references public.b2b_orders(id) on delete cascade,
  client_id         uuid references public.b2b_clients(id) on delete set null,
  channel           text not null default 'unknown'
    check (channel in ('email', 'kakao', 'unknown')),
  recipient_contact text,
  content_snapshot  text not null,
  delivery_status   text not null default 'unknown'
    check (delivery_status in ('sent', 'failed', 'unknown')),
  sent_at           timestamptz not null default now(),
  constraint b2b_withdrawal_notices_order_id_unique unique (order_id)
);

alter table public.b2b_withdrawal_notices enable row level security;

drop policy if exists "b2b-withdrawal-notices: owner select" on public.b2b_withdrawal_notices;
create policy "b2b-withdrawal-notices: owner select"
  on public.b2b_withdrawal_notices for select
  using (
    account_id in (
      select id from public.b2b_accounts where user_id = (select auth.uid())
    )
  );

create index if not exists idx_b2b_withdrawal_notices_account_sent
  on public.b2b_withdrawal_notices (account_id, sent_at desc);

-- 후속 (미래, RESEND_API_KEY 미등록이라 보류):
--   주문 status → 'completed' 전이 시 b2b_withdrawal_notices insert + 이메일/카카오 발송.
--   현재는 settings 토글·문구만 영속, 실제 자동 발송 로직 미구현 (stats 항상 0).
