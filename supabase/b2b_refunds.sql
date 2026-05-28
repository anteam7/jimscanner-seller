-- ─────────────────────────────────────────────
-- b2b_refunds — 환불 관리 (#idea-3 Phase 1: DDL)
-- 생성: 2026-05-28
-- 참조: github issue#3 (brainstorm approved 2026-05-27)
-- ─────────────────────────────────────────────
-- 마켓 구매자 환불 요청을 표준 워크플로우로 추적.
-- 한 주문(b2b_orders) 에 환불 1건+ (부분 환불·재요청 가능).
-- 라인 단위(b2b_order_items) 옵션 — null 이면 주문 전체 환불.
-- ─────────────────────────────────────────────

create table if not exists public.b2b_refunds (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.b2b_accounts(id) on delete cascade,
  order_id uuid not null references public.b2b_orders(id) on delete cascade,
  order_item_id uuid references public.b2b_order_items(id) on delete set null,

  -- 사유
  reason text not null,                                  -- 자유 텍스트 (구매자 메시지 요약 가능)
  reason_category text,                                  -- 분류 (월간 통계용)

  -- 상태
  status text not null default 'requested',
  status_history jsonb not null default '[]',            -- [{at, from, to, by}, ...]

  -- 금액
  refund_amount_krw bigint not null default 0,           -- 환불 금액 (KRW)
  refund_method text,                                    -- 'card' | 'bank_transfer' | 'point' | 자유

  -- 메모
  buyer_message text,                                    -- 마켓 구매자가 남긴 원문
  internal_notes text,                                   -- 셀러 내부 메모

  -- 시각
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  settled_at timestamptz,

  -- 메타
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint b2b_refunds_status_check
    check (status in (
      'requested','approved','denied','processing','settled','cancelled'
    )),
  constraint b2b_refunds_reason_category_check
    check (reason_category is null or reason_category in (
      'product_defect','wrong_item','customer_cancel',
      'customs_blocked','market_dispute','shipping_delay','other'
    )),
  constraint b2b_refunds_amount_nonneg
    check (refund_amount_krw >= 0)
);

create index if not exists idx_b2b_refunds_account_date
  on public.b2b_refunds(account_id, requested_at desc) where deleted_at is null;

create index if not exists idx_b2b_refunds_order
  on public.b2b_refunds(order_id) where deleted_at is null;

create index if not exists idx_b2b_refunds_status
  on public.b2b_refunds(account_id, status) where deleted_at is null;

-- updated_at 자동 트리거 (공통 함수 재사용)
drop trigger if exists tg_b2b_refunds_touch on public.b2b_refunds;
create trigger tg_b2b_refunds_touch
  before update on public.b2b_refunds
  for each row execute function public.tg_b2b_touch_updated_at();

-- RLS — 본인 계정 데이터만 (initplan 최적화 패턴: (select auth.uid()))
alter table public.b2b_refunds enable row level security;

drop policy if exists "b2b_refunds tenant rw" on public.b2b_refunds;
create policy "b2b_refunds tenant rw"
  on public.b2b_refunds for all
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
-- b2b_orders.status 에 'refund_requested' 추가
-- (기존 status_check 제약 교체)
-- ─────────────────────────────────────────────
alter table public.b2b_orders drop constraint if exists b2b_orders_status_check;
alter table public.b2b_orders add constraint b2b_orders_status_check
  check (status in (
    'pending','confirmed','paid','forwarder_submitted',
    'in_transit','arrived_korea','delivered','completed',
    'cancelled','refund_requested','refunded'
  ));

comment on table public.b2b_refunds is
  '환불 관리. 마켓 구매자 환불 요청을 라인/주문 단위로 추적. (#idea-3, 2026-05-28)';
