-- ─────────────────────────────────────────────
-- b2b_payment_cards — 결제 카드 관리 (#idea-4)
-- 생성: 2026-05-28
-- 참조: github issue#4 (brainstorm approved 2026-05-27)
-- ─────────────────────────────────────────────
-- 셀러가 매입 시 사용하는 카드 별칭·마지막 4자리·결제일 등을 등록.
-- 라인(b2b_order_items)에 payment_card_id 매핑 → 카드별 매입 합계 가시화.
-- 카드 번호 본번호는 절대 저장하지 않음 (PCI 회피, last4 만).
-- ─────────────────────────────────────────────

create table if not exists public.b2b_payment_cards (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.b2b_accounts(id) on delete cascade,

  alias text not null,                                   -- 사용자 정의 별칭 (예: "신한 BC")
  brand text,                                            -- visa / master / amex / jcb / unionpay / domestic / other
  last4 text,                                            -- 마지막 4자리 (검증 — 4 digits)
  color text,                                            -- preset key 또는 hex (UI 표시용)

  credit_limit_krw bigint,                               -- 카드 한도 (옵션)
  billing_day smallint,                                  -- 결제일 (1~31)

  sort_order integer not null default 0,
  is_active boolean not null default true,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint b2b_payment_cards_alias_len check (char_length(alias) between 1 and 60),
  constraint b2b_payment_cards_last4_format check (last4 is null or last4 ~ '^[0-9]{4}$'),
  constraint b2b_payment_cards_brand_check check (
    brand is null or brand in ('visa','master','amex','jcb','unionpay','domestic','other')
  ),
  constraint b2b_payment_cards_billing_day_range check (
    billing_day is null or (billing_day between 1 and 31)
  ),
  constraint b2b_payment_cards_credit_limit_nonneg check (
    credit_limit_krw is null or credit_limit_krw >= 0
  )
);

create index if not exists idx_b2b_payment_cards_account_active
  on public.b2b_payment_cards(account_id, is_active, sort_order) where deleted_at is null;

-- updated_at 자동 트리거 (공통 함수)
drop trigger if exists tg_b2b_payment_cards_touch on public.b2b_payment_cards;
create trigger tg_b2b_payment_cards_touch
  before update on public.b2b_payment_cards
  for each row execute function public.tg_b2b_touch_updated_at();

-- RLS (initplan 최적화 패턴)
alter table public.b2b_payment_cards enable row level security;

drop policy if exists "b2b_payment_cards tenant rw" on public.b2b_payment_cards;
create policy "b2b_payment_cards tenant rw"
  on public.b2b_payment_cards for all
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

-- ─────────────────────────────────────────────
-- b2b_order_items.payment_card_id 추가
-- 라인 단위 매입 카드 매핑.
-- ─────────────────────────────────────────────
alter table public.b2b_order_items
  add column if not exists payment_card_id uuid
  references public.b2b_payment_cards(id) on delete set null;

create index if not exists idx_b2b_order_items_payment_card
  on public.b2b_order_items(payment_card_id) where payment_card_id is not null;

comment on table public.b2b_payment_cards is
  '결제 카드 관리. 셀러 매입 시 사용 카드 별칭·last4·결제일 추적. (#idea-4, 2026-05-28)';
comment on column public.b2b_order_items.payment_card_id is
  '매입 결제에 사용한 카드. b2b_payment_cards 참조. (#idea-4)';
