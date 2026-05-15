-- B2B 직구 사업자 SaaS 스키마
-- 2026-05-14
-- 도메인: seller.jimscanner.co.kr (Vercel rewrite 로 /seller/* 라우트에 매핑)
-- 인증: Supabase Auth 풀 공유. b2b_accounts.user_id 가 auth.users(id) FK.
-- PII 정책: v0 기본 = 클라이언트 사이드만 (b2b_clients PII 필드 nullable). v1+ Pro 플랜 = 서버 저장.
-- 참고: memory/b2b_service_full_spec_2026_05_14.md

-- ─────────────────────────────────────────────
-- 1) 플랜 설정 (시드 가능한 공개 데이터)
-- ─────────────────────────────────────────────
create table if not exists public.b2b_subscription_plans (
  id uuid primary key default gen_random_uuid(),
  plan_code text not null unique,                   -- 'free' | 'lite' | 'pro' | 'enterprise'
  name_ko text not null,
  description text,
  price_krw_monthly int not null default 0,
  price_krw_yearly int not null default 0,
  monthly_order_quota int,                          -- null = unlimited
  required_verification_level int not null default 0,
  features jsonb not null default '{}',             -- {"trend_radar": true, "api_access": false, ...}
  is_active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 2) 사업자 계정 (Supabase Auth 와 1:1)
-- ─────────────────────────────────────────────
create table if not exists public.b2b_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,                              -- 검색용 denormalized
  -- 사업자 정보
  business_no varchar(10),                          -- 사업자등록번호 (10자리). 진위 확인 전엔 null
  business_name text,
  ceo_name text,
  business_type text,                               -- '개인사업자' | '법인사업자'
  business_category_main text,                      -- 업태
  business_category_sub text,                       -- 종목
  phone text,
  postal_code text,
  address text,                                     -- 도로명/지번 주소 본문
  detail_address text,                              -- 상세 주소 (호수 등)
  communication_sales_no text,                      -- 통신판매신고번호 (선택, L3 이상)
  -- 검증
  verification_level int not null default 0,        -- L0~L5
  verification_status text not null default 'email_pending',
  verification_rejected_reason text,
  business_no_verified_at timestamptz,              -- 국세청 자동 검증 통과 시각
  document_reviewed_at timestamptz,                 -- 사업자등록증 사진 수동/AI 검토 통과
  representative_verified_at timestamptz,           -- 대표자 본인 인증 통과
  -- 운영
  pii_storage_mode text not null default 'client_only',  -- 'client_only' | 'encrypted_server' | 'plain_server'
  marketing_opt_in boolean not null default false,
  -- 메타
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  suspended_at timestamptz,
  suspended_reason text,
  deleted_at timestamptz,
  deleted_reason text,                              -- 'self_requested' | 'admin_deleted' | 'policy_violation'
  constraint b2b_accounts_business_type_check
    check (business_type is null or business_type in ('개인사업자','법인사업자')),
  constraint b2b_accounts_verification_status_check
    check (verification_status in (
      'email_pending','email_verified','business_no_pending','business_no_verified',
      'document_pending_review','document_approved','document_rejected',
      'fully_verified','suspended','deleted'
    )),
  constraint b2b_accounts_pii_mode_check
    check (pii_storage_mode in ('client_only','encrypted_server','plain_server')),
  constraint b2b_accounts_business_no_format
    check (business_no is null or business_no ~ '^\d{10}$')
);

create unique index if not exists uniq_b2b_accounts_business_no
  on public.b2b_accounts(business_no)
  where business_no is not null and deleted_at is null;

create index if not exists idx_b2b_accounts_verification_status
  on public.b2b_accounts(verification_status) where deleted_at is null;

create index if not exists idx_b2b_accounts_email
  on public.b2b_accounts(email) where deleted_at is null;

-- ─────────────────────────────────────────────
-- 3) 약관 버전 + 동의 기록
-- ─────────────────────────────────────────────
create table if not exists public.b2b_terms_versions (
  id uuid primary key default gen_random_uuid(),
  version_code text not null,                       -- e.g., 'tos-v1', 'privacy-v2', 'b2b-sla-v1'
  category text not null,                           -- 'tos' | 'privacy' | 'b2b_sla' | 'marketing'
  title text not null,
  body text not null,                               -- markdown
  is_required boolean not null default true,
  effective_from timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint b2b_terms_category_check
    check (category in ('tos','privacy','b2b_sla','marketing'))
);

create unique index if not exists uniq_b2b_terms_version_code
  on public.b2b_terms_versions(version_code);

create index if not exists idx_b2b_terms_active_required
  on public.b2b_terms_versions(category, is_active, is_required);

create table if not exists public.b2b_account_terms_consent (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.b2b_accounts(id) on delete cascade,
  terms_version_id uuid not null references public.b2b_terms_versions(id),
  consented_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  unique (account_id, terms_version_id)
);

create index if not exists idx_b2b_consent_account
  on public.b2b_account_terms_consent(account_id);

-- ─────────────────────────────────────────────
-- 4) 인증 문서 (사업자등록증·통신판매신고증·대표자 신분증 등)
-- ─────────────────────────────────────────────
create table if not exists public.b2b_account_documents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.b2b_accounts(id) on delete cascade,
  document_type text not null,                      -- 'business_registration' | 'communication_sales' | 'representative_id' | 'bankbook'
  storage_path text not null,                       -- Supabase Storage path
  file_name text,
  mime_type text,
  size_bytes int,
  uploaded_at timestamptz not null default now(),
  -- AI 검토 (Gemini Vision)
  ai_review_status text not null default 'pending', -- 'pending' | 'approved' | 'flagged' | 'rejected' | 'failed'
  ai_review_notes jsonb,
  ai_reviewed_at timestamptz,
  -- 사람 검토
  human_review_status text not null default 'pending',
  human_reviewer_email text,
  human_review_notes text,
  human_reviewed_at timestamptz,
  constraint b2b_docs_type_check
    check (document_type in ('business_registration','communication_sales','representative_id','bankbook')),
  constraint b2b_docs_ai_status_check
    check (ai_review_status in ('pending','approved','flagged','rejected','failed','skipped')),
  constraint b2b_docs_human_status_check
    check (human_review_status in ('pending','approved','rejected'))
);

create index if not exists idx_b2b_docs_account
  on public.b2b_account_documents(account_id);

create index if not exists idx_b2b_docs_review_pending
  on public.b2b_account_documents(document_type, human_review_status)
  where human_review_status = 'pending';

-- ─────────────────────────────────────────────
-- 5) 구독·결제
-- ─────────────────────────────────────────────
create table if not exists public.b2b_subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references public.b2b_accounts(id) on delete cascade,
  plan_id uuid not null references public.b2b_subscription_plans(id),
  status text not null default 'active',
  period_start timestamptz not null default now(),
  period_end timestamptz,
  next_billing_at timestamptz,
  monthly_order_used int not null default 0,
  monthly_order_quota_override int,                 -- null = plan default
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint b2b_subs_status_check
    check (status in ('active','past_due','cancelled','paused','trial'))
);

create index if not exists idx_b2b_subs_status
  on public.b2b_subscriptions(status);

create index if not exists idx_b2b_subs_billing
  on public.b2b_subscriptions(next_billing_at)
  where status = 'active';

-- ─────────────────────────────────────────────
-- 6) 의뢰자 (mini CRM)
-- v0 default: PII 필드 비움 (pii_storage_mode='client_only').
-- v1+ Pro: 암호화 보관 또는 plain.
-- ─────────────────────────────────────────────
create table if not exists public.b2b_clients (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.b2b_accounts(id) on delete cascade,
  -- 식별
  external_id text,                                 -- 사업자가 부여한 의뢰자 코드 (선택)
  display_name text not null,                       -- 카카오 닉네임·이니셜 등 가벼운 식별
  -- PII (Pro+ 옵션, v0 에선 null)
  full_name text,
  phone text,
  email text,
  postal_code text,
  address text,
  detail_address text,
  encrypted_pii jsonb,                              -- v2: 클라이언트 사이드 암호화된 묶음
  -- CRM
  notes text,
  tags text[] not null default '{}',
  vip_grade text not null default 'normal',         -- 'normal' | 'vip' | 'vvip' | 'blacklist'
  -- 통계 (트리거로 자동 갱신 또는 view)
  total_orders int not null default 0,
  total_revenue_krw bigint not null default 0,
  -- 메타
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint b2b_clients_vip_check
    check (vip_grade in ('normal','vip','vvip','blacklist'))
);

create index if not exists idx_b2b_clients_account
  on public.b2b_clients(account_id) where deleted_at is null;

create index if not exists idx_b2b_clients_account_name
  on public.b2b_clients(account_id, display_name) where deleted_at is null;

create index if not exists idx_b2b_clients_vip
  on public.b2b_clients(account_id, vip_grade) where deleted_at is null;

create unique index if not exists uniq_b2b_clients_external_id
  on public.b2b_clients(account_id, external_id)
  where external_id is not null and deleted_at is null;

-- ─────────────────────────────────────────────
-- 7) 주문 (사업자가 의뢰자로부터 받은 주문)
-- ─────────────────────────────────────────────
create table if not exists public.b2b_orders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.b2b_accounts(id) on delete cascade,
  client_id uuid references public.b2b_clients(id) on delete set null,
  -- 식별
  order_number text not null,                       -- 사업자 자체 번호 (UI 표시용)
  source text not null default 'manual',            -- 'manual' | 'excel_upload' | 'google_form' | 'kakao' | 'webhook' | 'api'
  source_meta jsonb,                                -- 임포트 출처 정보 (파일명·webhook URL 등)
  -- 상태
  status text not null default 'pending',
  status_history jsonb not null default '[]',       -- [{at, from, to, by}, ...]
  -- 배대지
  forwarder_id uuid references public.forwarders(id) on delete set null,
  forwarder_country varchar(10),                    -- 'US' | 'JP' | 'CN' 등
  forwarder_request_no text,                        -- 배대지에 신청 시 받는 번호 (외부)
  forwarder_submitted_at timestamptz,
  -- 비용 (KRW)
  estimated_cost_krw bigint,
  actual_cost_krw bigint,
  margin_krw bigint,
  exchange_rate_applied jsonb,                      -- {USD: 1310, JPY: 9.2, ...} at order time
  -- 메모
  request_notes text,                               -- 의뢰자 요청 사항
  internal_notes text,                              -- 사업자 내부 메모
  -- 메타
  order_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint b2b_orders_status_check
    check (status in (
      'pending','confirmed','paid','forwarder_submitted',
      'in_transit','arrived_korea','delivered','completed',
      'cancelled','refunded'
    )),
  constraint b2b_orders_source_check
    check (source in ('manual','excel_upload','google_form','kakao','webhook','api','migration'))
);

create unique index if not exists uniq_b2b_orders_account_number
  on public.b2b_orders(account_id, order_number) where deleted_at is null;

create index if not exists idx_b2b_orders_account_date
  on public.b2b_orders(account_id, order_date desc) where deleted_at is null;

create index if not exists idx_b2b_orders_status
  on public.b2b_orders(account_id, status) where deleted_at is null;

create index if not exists idx_b2b_orders_client
  on public.b2b_orders(client_id) where deleted_at is null;

create index if not exists idx_b2b_orders_forwarder
  on public.b2b_orders(forwarder_id) where deleted_at is null;

-- ─────────────────────────────────────────────
-- 8) 주문 라인 아이템
-- ─────────────────────────────────────────────
create table if not exists public.b2b_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.b2b_orders(id) on delete cascade,
  display_order int not null default 0,
  -- 상품
  product_name text not null,
  product_url text,
  product_image_url text,
  category text,
  brand text,
  -- 수량·가격
  quantity int not null default 1,
  unit_price_foreign numeric(12,2),
  currency varchar(3),                              -- 'USD' | 'JPY' | 'CNY' | 'EUR' | 'KRW'
  total_price_foreign numeric(14,2),
  total_price_krw bigint,
  -- 물성
  weight_kg numeric(8,3),
  -- 배송
  tracking_number text,
  -- 메타
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_b2b_items_order
  on public.b2b_order_items(order_id, display_order);

create index if not exists idx_b2b_items_tracking
  on public.b2b_order_items(tracking_number) where tracking_number is not null;

-- ─────────────────────────────────────────────
-- 9) 배대지 양식 매핑 (자주 쓰는 컬럼 매핑 프리셋)
-- ─────────────────────────────────────────────
create table if not exists public.b2b_forwarder_mappings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.b2b_accounts(id) on delete cascade,
  forwarder_id uuid not null references public.forwarders(id) on delete cascade,
  mapping_name text not null,                       -- '기본 매핑', '고객 A용' 등
  column_map jsonb not null,                        -- {source_col: target_col, transform: 'as-is'|'upper'|'pad'} ...
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uniq_b2b_mappings_default
  on public.b2b_forwarder_mappings(account_id, forwarder_id)
  where is_default = true;

create index if not exists idx_b2b_mappings_account
  on public.b2b_forwarder_mappings(account_id);

-- ─────────────────────────────────────────────
-- 10) 배송 (운송장 트래킹)
-- ─────────────────────────────────────────────
create table if not exists public.b2b_shipments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.b2b_accounts(id) on delete cascade,
  order_id uuid references public.b2b_orders(id) on delete set null,
  forwarder_id uuid references public.forwarders(id) on delete set null,
  country varchar(10),
  tracking_number text,
  forwarder_request_no text,
  -- 상태
  status text not null default 'submitted',
  submitted_at timestamptz default now(),
  arrived_at timestamptz,
  shipped_at timestamptz,
  arrived_korea_at timestamptz,
  delivered_at timestamptz,
  last_synced_at timestamptz,
  -- 원본 데이터 (배대지·관세청 API 응답)
  raw_status_data jsonb,
  -- 메타
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint b2b_shipments_status_check
    check (status in (
      'submitted','arrived_warehouse','packed','shipped',
      'in_transit','arrived_korea','customs','delivered','failed','returned'
    ))
);

create index if not exists idx_b2b_shipments_account
  on public.b2b_shipments(account_id);

create index if not exists idx_b2b_shipments_tracking
  on public.b2b_shipments(tracking_number) where tracking_number is not null;

create index if not exists idx_b2b_shipments_status
  on public.b2b_shipments(account_id, status);

-- ─────────────────────────────────────────────
-- 11) 감사 로그
-- ─────────────────────────────────────────────
create table if not exists public.b2b_audit_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.b2b_accounts(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,                             -- 'login' | 'order_created' | 'pii_accessed' | 'order_exported' | 'mapping_saved' ...
  target_type text,                                 -- 'order' | 'client' | 'document' | 'mapping' | ...
  target_id uuid,
  ip_address inet,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_b2b_audit_account_time
  on public.b2b_audit_log(account_id, created_at desc);

create index if not exists idx_b2b_audit_action
  on public.b2b_audit_log(action, created_at desc);

-- ─────────────────────────────────────────────
-- 12) updated_at 자동 갱신 트리거 (공통 함수 재사용)
-- ─────────────────────────────────────────────
create or replace function public.tg_b2b_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'b2b_subscription_plans','b2b_accounts','b2b_subscriptions',
    'b2b_clients','b2b_orders','b2b_order_items',
    'b2b_forwarder_mappings','b2b_shipments'
  ]
  loop
    execute format(
      'drop trigger if exists tg_%I_touch on public.%I',
      t, t
    );
    execute format(
      'create trigger tg_%I_touch before update on public.%I '
      'for each row execute function public.tg_b2b_touch_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ─────────────────────────────────────────────
-- 13) 결제 영수증
-- ─────────────────────────────────────────────
create table if not exists public.b2b_payment_receipts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.b2b_accounts(id) on delete cascade,
  subscription_id uuid references public.b2b_subscriptions(id) on delete set null,
  amount_krw int not null,
  tax_krw int not null default 0,
  billing_period_start date,
  billing_period_end date,
  payment_method text not null default 'manual',     -- 'manual' | 'card' | 'bank_transfer' | 'vbank'
  pg_transaction_id text,
  receipt_no text not null,
  issued_at timestamptz not null default now(),
  refunded_at timestamptz,
  refund_reason text,
  refund_amount_krw int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint b2b_receipts_payment_method_check
    check (payment_method in ('manual','card','bank_transfer','vbank'))
);

create unique index if not exists uniq_b2b_receipts_no
  on public.b2b_payment_receipts(receipt_no);

create index if not exists idx_b2b_receipts_account
  on public.b2b_payment_receipts(account_id, issued_at desc);

create index if not exists idx_b2b_receipts_refund
  on public.b2b_payment_receipts(refunded_at)
  where refunded_at is not null;

drop trigger if exists tg_b2b_payment_receipts_touch on public.b2b_payment_receipts;
create trigger tg_b2b_payment_receipts_touch
  before update on public.b2b_payment_receipts
  for each row execute function public.tg_b2b_touch_updated_at();

-- ─────────────────────────────────────────────
-- 14) RLS — tenant isolation (account_id 기반)
-- 모든 b2b_* 테이블 RLS 활성화. service_role 은 bypass.
-- ─────────────────────────────────────────────

-- 계정 본인 정보
alter table public.b2b_accounts enable row level security;
create policy "b2b_accounts owner select"
  on public.b2b_accounts for select
  using (user_id = auth.uid());
create policy "b2b_accounts owner update"
  on public.b2b_accounts for update
  using (user_id = auth.uid());
-- INSERT 는 가입 API 에서 service_role 로만 (auth.users 트리거 후)

-- 플랜 — 공개 read
alter table public.b2b_subscription_plans enable row level security;
create policy "b2b_plans public read"
  on public.b2b_subscription_plans for select
  using (is_active = true);

-- 약관 — 공개 read (활성 버전)
alter table public.b2b_terms_versions enable row level security;
create policy "b2b_terms public read"
  on public.b2b_terms_versions for select
  using (is_active = true);

-- 동의 — 본인 것만
alter table public.b2b_account_terms_consent enable row level security;
create policy "b2b_consent owner select"
  on public.b2b_account_terms_consent for select
  using (account_id in (select id from public.b2b_accounts where user_id = auth.uid()));

-- 문서 — 본인 것만 (업로드는 service_role 경유)
alter table public.b2b_account_documents enable row level security;
create policy "b2b_documents owner select"
  on public.b2b_account_documents for select
  using (account_id in (select id from public.b2b_accounts where user_id = auth.uid()));

-- 구독 — 본인 것만
alter table public.b2b_subscriptions enable row level security;
create policy "b2b_subscriptions owner select"
  on public.b2b_subscriptions for select
  using (account_id in (select id from public.b2b_accounts where user_id = auth.uid()));

-- 의뢰자·주문·아이템·매핑·배송 — 본인 계정 데이터만 (전체 CRUD)
do $$
declare t text;
begin
  foreach t in array array['b2b_clients','b2b_orders','b2b_order_items','b2b_forwarder_mappings','b2b_shipments']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy "b2b_clients tenant rw"
  on public.b2b_clients for all
  using (account_id in (select id from public.b2b_accounts where user_id = auth.uid()))
  with check (account_id in (select id from public.b2b_accounts where user_id = auth.uid()));

create policy "b2b_orders tenant rw"
  on public.b2b_orders for all
  using (account_id in (select id from public.b2b_accounts where user_id = auth.uid()))
  with check (account_id in (select id from public.b2b_accounts where user_id = auth.uid()));

create policy "b2b_order_items tenant rw"
  on public.b2b_order_items for all
  using (order_id in (
    select id from public.b2b_orders
    where account_id in (select id from public.b2b_accounts where user_id = auth.uid())
  ))
  with check (order_id in (
    select id from public.b2b_orders
    where account_id in (select id from public.b2b_accounts where user_id = auth.uid())
  ));

create policy "b2b_forwarder_mappings tenant rw"
  on public.b2b_forwarder_mappings for all
  using (account_id in (select id from public.b2b_accounts where user_id = auth.uid()))
  with check (account_id in (select id from public.b2b_accounts where user_id = auth.uid()));

create policy "b2b_shipments tenant rw"
  on public.b2b_shipments for all
  using (account_id in (select id from public.b2b_accounts where user_id = auth.uid()))
  with check (account_id in (select id from public.b2b_accounts where user_id = auth.uid()));

-- 감사 로그 — 본인 것만 read, write 는 service_role
alter table public.b2b_audit_log enable row level security;
create policy "b2b_audit owner select"
  on public.b2b_audit_log for select
  using (account_id in (select id from public.b2b_accounts where user_id = auth.uid()));

-- 결제 영수증 — 본인 것만 read, write 는 service_role
alter table public.b2b_payment_receipts enable row level security;
create policy "b2b_receipts owner select"
  on public.b2b_payment_receipts for select
  using (account_id in (select id from public.b2b_accounts where user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- 14) 시드 — 플랜 4종
-- ─────────────────────────────────────────────
insert into public.b2b_subscription_plans (plan_code, name_ko, description, price_krw_monthly, price_krw_yearly, monthly_order_quota, required_verification_level, features, display_order)
values
  ('free',       'Free Beta',  '베타 한정 무료. 월 50건 처리. 기본 기능만.',
                  0, 0, 50, 1,
                  '{"order_excel_upload": true, "forwarder_recommend": true, "saved_mappings": false, "tracking_auto": false, "intelligence": false, "team": false, "api": false}',
                  1),
  ('lite',       'Lite',       '1인 구매대행. 월 200건. 매핑 저장·운송장 자동.',
                  19900, 199000, 200, 1,
                  '{"order_excel_upload": true, "forwarder_recommend": true, "saved_mappings": true, "tracking_auto": true, "intelligence": false, "team": false, "api": false}',
                  2),
  ('pro',        'Pro',        '다중 채널·정산·인텔리전스. 월 1,000건.',
                  49900, 499000, 1000, 2,
                  '{"order_excel_upload": true, "forwarder_recommend": true, "saved_mappings": true, "tracking_auto": true, "intelligence": true, "team": true, "api": false, "encrypted_pii": true}',
                  3),
  ('enterprise', 'Enterprise', '협의. 무제한·API·전용 지원.',
                  0, 0, null, 4,
                  '{"order_excel_upload": true, "forwarder_recommend": true, "saved_mappings": true, "tracking_auto": true, "intelligence": true, "team": true, "api": true, "encrypted_pii": true, "rpa": true}',
                  4)
on conflict (plan_code) do nothing;

-- ─────────────────────────────────────────────
-- 15) 시드 — 약관 본문 v1 (2026-05-15 제정)
-- ─────────────────────────────────────────────
insert into public.b2b_terms_versions (version_code, category, title, body, is_required, effective_from)
values (
  'tos-v1', 'tos', '이용약관 v1',
  $tos$# 짐스캐너 B2B 서비스 이용약관

**시행일**: 2026년 5월 15일 | **버전**: v1

---

## 제1조 (목적)

이 약관은 안승혁(이하 "회사")이 운영하는 짐스캐너 B2B 서비스(이하 "서비스")를 이용함에 있어 회사와 이용 사업자(이하 "사업자") 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.

## 제2조 (용어 정의)

1. "서비스"란 회사가 제공하는 구매대행 사업자용 주문 관리·배대지 양식 변환·클라이언트 CRM 등의 SaaS 솔루션을 말합니다.
2. "사업자"란 사업자등록증을 보유하고 본 서비스에 가입한 구매대행 업체를 말합니다.
3. "플랜"이란 서비스 이용 범위를 결정하는 구독 단계(Free·Lite·Pro·Enterprise)를 말합니다.

## 제3조 (약관의 효력 및 변경)

1. 이 약관은 서비스 가입 시 동의함으로써 효력이 발생합니다.
2. 회사는 합리적인 사유가 발생할 경우 「약관의 규제에 관한 법률」에 따라 약관을 변경할 수 있습니다.
3. 변경된 약관은 시행 7일 전 서비스 내 공지하며, 사업자에게 불이익한 변경의 경우 30일 전 공지합니다.

## 제4조 (서비스 제공)

1. 회사는 연중무휴 24시간 서비스를 제공하는 것을 원칙으로 합니다.
2. 정기 점검은 매월 셋째 주 일요일 02:00~04:00 KST를 기준으로 하며, 최소 48시간 전 사전 공지 후 진행합니다.
3. 긴급 점검의 경우 즉시 공지 후 진행할 수 있습니다.

## 제5조 (이용 요금 및 구독)

1. 서비스 이용 요금은 선택한 플랜에 따라 월간 또는 연간으로 청구됩니다.
2. 구독은 자동 갱신이 원칙이며, 갱신 7일 전까지 해지 신청이 없을 경우 동일 조건으로 갱신됩니다.
3. **환불 정책**: 구독 시작일로부터 7일 이내 미사용 상태인 경우 전액 환불이 가능합니다. 이후 기간은 잔여 기간 비례 환불을 원칙으로 합니다.

## 제6조 (사업자의 의무)

1. 사업자는 실제 사업자등록을 보유한 구매대행 사업자여야 합니다.
2. 타인의 명의를 도용하거나 허위 정보를 등록해서는 안 됩니다.
3. 서비스를 이용하여 불법 행위를 해서는 안 됩니다.
4. 계정 정보는 본인만 사용해야 하며, 타인에게 양도·공유해서는 안 됩니다 (팀원 초대 기능 제외).

## 제7조 (회사의 의무)

1. 회사는 사업자의 개인정보를 본 약관 및 개인정보처리방침에 따라 보호합니다.
2. 회사는 서비스 장애 발생 시 즉시 복구에 노력하며, 2시간 이상 장애 지속 시 서비스 내 공지합니다.
3. 회사는 사업자의 데이터를 무단으로 제3자에게 제공하지 않습니다.

## 제8조 (지식재산권)

1. 서비스 내 콘텐츠·소프트웨어·UI의 저작권은 회사에 귀속됩니다.
2. 사업자가 서비스에 등록한 주문·클라이언트 데이터의 소유권은 사업자에 귀속됩니다.
3. 사업자는 계약 해지 후 30일 이내 데이터 내보내기를 요청할 수 있습니다.

## 제9조 (서비스 이용 제한)

회사는 사업자가 다음 각 호에 해당하는 경우 서비스 이용을 제한할 수 있습니다.

1. 허위·불법 정보로 가입한 경우
2. 타 사업자의 서비스 이용을 방해한 경우
3. 서비스 인프라에 과도한 부하를 주는 행위를 한 경우
4. 관계 법령을 위반한 경우

## 제10조 (책임의 한계)

1. 회사는 천재지변·불가항력 등 회사의 귀책사유가 없는 경우 책임을 지지 않습니다.
2. 사업자의 귀책사유로 인한 서비스 이용 장애에 대해 회사는 책임을 지지 않습니다.
3. 서비스를 통해 사업자와 의뢰자 간에 발생한 분쟁은 해당 당사자 간 해결을 원칙으로 합니다.

## 제11조 (분쟁 해결)

1. 서비스 이용과 관련한 분쟁은 회사와 사업자가 성실하게 협의하여 해결합니다.
2. 분쟁이 해결되지 않을 경우 관할 법원의 판결에 따릅니다.
3. 본 약관과 관련한 소송의 관할 법원은 서울중앙지방법원으로 합니다.

---

*문의: support@jimscanner.co.kr*$tos$,
  true, '2026-05-15T00:00:00+09:00'
),
(
  'privacy-v1', 'privacy', '개인정보처리방침 v1',
  $priv$# 짐스캐너 B2B 개인정보처리방침

**시행일**: 2026년 5월 15일 | **버전**: v1

안승혁(이하 "회사")은 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보 보호 및 권익을 위하여 본 개인정보처리방침을 수립·공개합니다.

---

## 1. 수집하는 개인정보 항목

**필수 항목**
- 이메일 주소, 비밀번호(해시 저장)
- 사업자등록번호, 상호명, 대표자명, 업태, 종목
- 사업장 전화번호, 우편번호, 주소

**선택 항목**
- 마케팅 수신 동의 시: 이메일 주소(별도 목적)

**자동 수집 항목**
- 접속 IP, 접속 시각, 브라우저 종류, 서비스 이용 기록

## 2. 개인정보의 수집·이용 목적

| 목적 | 항목 |
|------|------|
| 회원 식별 및 인증 | 이메일, 비밀번호 |
| 사업자 자격 확인 | 사업자등록번호, 대표자명, 주소 |
| 서비스 제공 및 계약 이행 | 전체 사업자 정보 |
| 공지사항·고객 지원 응대 | 이메일 |
| 국세청 사업자등록 진위 확인 | 사업자등록번호, 대표자명, 개업일 |
| 부정 이용 방지 | 접속 IP, 이용 기록 |

## 3. 개인정보의 보유 및 이용 기간

- **회원 탈퇴 시**: 즉시 삭제 (단, 관계 법령에 따라 보존 필요한 정보는 별도 보관)
- **전자상거래 관련 기록**: 5년 (「전자상거래 등에서의 소비자보호에 관한 법률」)
- **계약·청약 철회 기록**: 5년
- **소비자 불만 및 분쟁 처리**: 3년

## 4. 개인정보의 제3자 제공

회사는 원칙적으로 사업자의 개인정보를 제3자에게 제공하지 않습니다. 단, 다음의 경우는 예외입니다.

- 사업자의 사전 동의가 있는 경우
- 법령의 규정에 따른 경우 (수사기관 요청 등)

## 5. 개인정보 처리 위탁

| 수탁업체 | 위탁 업무 | 보유·이용 기간 |
|----------|-----------|----------------|
| Supabase Inc. | 데이터베이스 저장·인증 처리 | 계약 기간 |
| Resend Inc. | 이메일 발송 서비스 | 발송 완료 후 즉시 |
| 국세청 (NTS) | 사업자등록 진위 확인 | API 응답 즉시 삭제 |

## 6. 정보주체의 권리·의무 및 행사 방법

정보주체는 회사에 대해 언제든지 다음의 개인정보 보호 관련 권리를 행사할 수 있습니다.

1. 개인정보 열람 요구
2. 오류 등이 있을 경우 정정 요구
3. 삭제 요구
4. 처리 정지 요구

권리 행사는 서면, 전화, 이메일로 하실 수 있으며, 회사는 지체 없이 조치하겠습니다.
*이메일: privacy@jimscanner.co.kr*

## 7. 개인정보의 파기 절차 및 방법

- **전자적 파일**: 기록을 재생할 수 없는 기술적 방법으로 삭제
- **종이 문서**: 분쇄하거나 소각하여 파기

## 8. 개인정보 보호책임자

- **성명**: 안승혁
- **이메일**: privacy@jimscanner.co.kr
- **문의**: 서비스 내 1:1 문의 이용

## 9. 개정 이력

| 버전 | 시행일 | 주요 변경 사항 |
|------|--------|----------------|
| v1 | 2026-05-15 | 최초 제정 |$priv$,
  true, '2026-05-15T00:00:00+09:00'
),
(
  'b2b-sla-v1', 'b2b_sla', 'B2B SaaS 서비스 수준 약관 v1',
  $sla$# 짐스캐너 B2B 서비스 수준 약관 (SLA)

**시행일**: 2026년 5월 15일 | **버전**: v1

본 서비스 수준 약관(SLA)은 짐스캐너 B2B 서비스의 가용성, 지원 응답 시간, 보상 정책을 정의합니다.

---

## 1. 서비스 가용성 (Uptime)

| 플랜 | 월간 가용성 목표 |
|------|----------------|
| Free | 99.0% |
| Lite | 99.0% |
| Pro | 99.5% |
| Enterprise | 협의 |

- **가용성 계산식**: (총 분 - 장애 분) / 총 분 × 100
- 정기 점검 시간은 가용성 계산에서 제외됩니다.

## 2. 정기 점검 (Maintenance Window)

- **주기**: 월 1회 이하
- **기준 시간**: 매월 셋째 주 일요일 02:00~04:00 KST
- **사전 공지**: 점검 48시간 전 서비스 내 공지
- 긴급 점검의 경우 최대한 신속하게 공지 후 진행합니다.

## 3. 장애 대응 시간

| 장애 등급 | 정의 | 첫 응답 | 복구 목표 |
|-----------|------|---------|-----------|
| P0 (Critical) | 서비스 전면 중단 | 30분 내 | 4시간 내 |
| P1 (High) | 핵심 기능 불가 | 2시간 내 | 8시간 내 |
| P2 (Medium) | 일부 기능 저하 | 8시간 내 | 48시간 내 |
| P3 (Low) | 경미한 불편 | 24시간 내 | 7일 내 |

## 4. 고객 지원 응답 시간

| 플랜 | 지원 채널 | 첫 응답 SLA |
|------|----------|-------------|
| Free | 이메일 | 영업일 기준 3일 |
| Lite | 이메일 | 영업일 기준 1일 |
| Pro | 이메일 + 우선 대기 | 24시간 내 |
| Enterprise | 전담 채널 | 협의 |

- 영업일: 월~금 09:00~18:00 KST (공휴일 제외)

## 5. 데이터 보호

- **데이터 백업**: 일 1회 자동 백업 (Supabase 기본 제공)
- **백업 보존**: 최근 7일치 복원 가능
- **데이터 내보내기**: 계정 해지 후 30일 이내 요청 시 제공
- **암호화**: 전송 중 TLS 1.2 이상, 저장 시 AES-256

## 6. 보상 정책

월간 가용성이 목표치에 미달 시:

| 실제 가용성 | 보상 (월 구독료 기준) |
|-------------|----------------------|
| 99.0% ~ 95.0% | 10% 크레딧 |
| 95.0% 미만 | 25% 크레딧 |
| 50.0% 미만 | 50% 크레딧 |

- 보상은 다음 달 구독료에서 차감하는 크레딧으로 제공합니다.
- Free 플랜은 크레딧 보상 대상에서 제외됩니다.
- 보상 신청은 장애 발생 월의 말일로부터 15일 이내 고객지원을 통해 요청해야 합니다.

## 7. 면책 조항

다음의 경우 SLA 적용에서 제외됩니다.

- 사업자의 귀책사유로 인한 장애
- 천재지변, 국가 비상사태, 인터넷 망 장애 등 불가항력
- Supabase, Vercel 등 서드파티 플랫폼의 전체 장애
- 정기 점검 시간

## 8. SLA 개정

SLA는 30일 전 공지 후 변경됩니다. 변경에 동의하지 않을 경우 유료 구독 해지가 가능합니다.$sla$,
  true, '2026-05-15T00:00:00+09:00'
),
(
  'marketing-v1', 'marketing', '마케팅 정보 수신 동의 v1',
  $mkt$# 마케팅 정보 수신 동의

짐스캐너 B2B 서비스의 업데이트, 프로모션, 사업자 유용 정보 안내를 위한 마케팅 이메일 수신에 동의합니다.

---

## 수신하게 될 정보의 종류

- 신규 기능 출시 및 업데이트 안내
- 플랜 업그레이드 프로모션 및 할인 이벤트
- 구매대행 사업 유용 정보 (배대지 비교, 관세 정책 변경 등)
- 월간 서비스 이용 요약 리포트
- 웨비나·교육 콘텐츠 안내

## 수신 방법

이메일 (가입 시 등록한 이메일 주소로 발송)

## 발송 빈도

월 평균 1~4회 (이벤트에 따라 변동 가능)

## 동의 철회 방법

- 이메일 하단 "수신 거부" 링크 클릭
- 서비스 내 설정 → 알림 설정 → 마케팅 수신 동의 해제
- 고객지원(support@jimscanner.co.kr)으로 요청

동의 철회 후 최대 3 영업일 내에 처리됩니다.

## 개인정보 처리

수집된 이메일 주소는 마케팅 발송 목적으로만 사용되며, 제3자에게 제공되지 않습니다.
자세한 사항은 개인정보처리방침을 참조해 주세요.

**본 동의는 선택사항이며, 미동의 시에도 서비스 이용에 제한이 없습니다.**$mkt$,
  false, '2026-05-15T00:00:00+09:00'
)
-- 정책: placeholder('작성 예정') 행만 갱신. 실제 본문이 이미 있으면 절대 덮어쓰지 않음.
-- 약관 내용 변경 시 tos-v2 등 새 version_code 를 발행하는 방식으로만 처리할 것.
-- (개인정보보호법 §22 — 동의 당시 본문 증빙력 보존)
on conflict (version_code) do update set
  body = excluded.body,
  title = excluded.title,
  effective_from = excluded.effective_from
where public.b2b_terms_versions.body like '%작성 예정%';

-- ─────────────────────────────────────────────
-- 16) 쿼터 트리거 — 주문 생성 시 monthly_order_used 자동 증가
-- ─────────────────────────────────────────────
create or replace function public.tg_b2b_order_increment_quota()
returns trigger language plpgsql as $$
begin
  update public.b2b_subscriptions
  set monthly_order_used = monthly_order_used + 1,
      updated_at = now()
  where account_id = NEW.account_id;
  return NEW;
end;
$$;

drop trigger if exists tg_b2b_order_quota_increment on public.b2b_orders;
create trigger tg_b2b_order_quota_increment
  after insert on public.b2b_orders
  for each row execute function public.tg_b2b_order_increment_quota();

-- 월 초 monthly_order_used 리셋 함수 (Supabase cron 으로 매월 1일 00:10 KST 실행 권장)
create or replace function public.b2b_reset_monthly_order_quota()
returns void language plpgsql security definer as $$
begin
  update public.b2b_subscriptions
  set monthly_order_used = 0,
      updated_at = now()
  where status in ('active', 'trial');
end;
$$;

-- ─────────────────────────────────────────────
-- 17) b2b_audit_log 자동 insert 트리거 — 주요 상태 변경 자동 기록
-- API 레벨 명시 로그의 안전망: DB 레벨에서 핵심 상태 전이를 항상 기록.
-- security definer → postgres 권한으로 RLS 우회 후 audit_log insert.
-- metadata.trigger='auto' 로 API 명시 로그와 구분 가능.
-- ─────────────────────────────────────────────

-- 17-A) 사업자 계정 상태 변경 감사
-- audit log INSERT 실패 시 원래 UPDATE(정지·삭제 등)가 롤백되는 것을 방지하기 위해
-- inner BEGIN...EXCEPTION 블록으로 감쌈 — INSERT 오류는 무시하고 원래 트랜잭션은 커밋.
create or replace function public.tg_b2b_accounts_audit()
returns trigger language plpgsql security definer as $$
begin
  -- verification_status 변경 (이메일 인증·사업자 검증·승인·거절 등)
  if NEW.verification_status is distinct from OLD.verification_status then
    begin
      insert into public.b2b_audit_log (account_id, action, target_type, target_id, metadata)
      values (
        NEW.id,
        'verification_status_changed',
        'b2b_account',
        NEW.id,
        jsonb_build_object(
          'old', OLD.verification_status,
          'new', NEW.verification_status,
          'trigger', 'auto'
        )
      );
    exception when others then null;
    end;
  end if;

  -- 계정 정지(suspended_at SET) / 복구(suspended_at CLEARED)
  if NEW.suspended_at is distinct from OLD.suspended_at then
    begin
      insert into public.b2b_audit_log (account_id, action, target_type, target_id, metadata)
      values (
        NEW.id,
        case when NEW.suspended_at is not null then 'account_suspended' else 'account_unsuspended' end,
        'b2b_account',
        NEW.id,
        jsonb_build_object(
          'suspended_reason', NEW.suspended_reason,
          'trigger', 'auto'
        )
      );
    exception when others then null;
    end;
  end if;

  -- soft delete
  if NEW.deleted_at is distinct from OLD.deleted_at and NEW.deleted_at is not null then
    begin
      insert into public.b2b_audit_log (account_id, action, target_type, target_id, metadata)
      values (
        NEW.id,
        'account_deleted',
        'b2b_account',
        NEW.id,
        jsonb_build_object('deleted_reason', NEW.deleted_reason, 'trigger', 'auto')
      );
    exception when others then null;
    end;
  end if;

  return NEW;
end;
$$;

drop trigger if exists tg_b2b_accounts_audit on public.b2b_accounts;
create trigger tg_b2b_accounts_audit
  after update on public.b2b_accounts
  for each row
  when (
    NEW.verification_status is distinct from OLD.verification_status or
    NEW.suspended_at       is distinct from OLD.suspended_at or
    NEW.deleted_at         is distinct from OLD.deleted_at
  )
  execute function public.tg_b2b_accounts_audit();

-- 17-B) 구독 플랜·상태 변경 감사
create or replace function public.tg_b2b_subscriptions_audit()
returns trigger language plpgsql security definer as $$
begin
  -- 플랜 변경 (업그레이드 / 다운그레이드)
  if NEW.plan_id is distinct from OLD.plan_id then
    begin
      insert into public.b2b_audit_log (account_id, action, target_type, target_id, metadata)
      values (
        NEW.account_id,
        'plan_changed',
        'b2b_subscription',
        NEW.id,
        jsonb_build_object(
          'old_plan_id', OLD.plan_id,
          'new_plan_id', NEW.plan_id,
          'trigger', 'auto'
        )
      );
    exception when others then null;
    end;
  end if;

  -- 구독 상태 변경 (active / cancelled / past_due / paused / trial)
  if NEW.status is distinct from OLD.status then
    begin
      insert into public.b2b_audit_log (account_id, action, target_type, target_id, metadata)
      values (
        NEW.account_id,
        'subscription_status_changed',
        'b2b_subscription',
        NEW.id,
        jsonb_build_object(
          'old', OLD.status,
          'new', NEW.status,
          'trigger', 'auto'
        )
      );
    exception when others then null;
    end;
  end if;

  return NEW;
end;
$$;

drop trigger if exists tg_b2b_subscriptions_audit on public.b2b_subscriptions;
create trigger tg_b2b_subscriptions_audit
  after update on public.b2b_subscriptions
  for each row
  when (
    NEW.plan_id is distinct from OLD.plan_id or
    NEW.status  is distinct from OLD.status
  )
  execute function public.tg_b2b_subscriptions_audit();

-- 17-C) 사업자 문서 사람 검토 결과 감사
-- 수정: OLD.human_review_status = 'pending' 조건 제거 → approved↔rejected 재검토도 기록
-- (개인정보보호법·감사 컴플라이언스: 어드민 모든 상태 전환 추적 필요)
-- old_status 추가로 전환 경로 완전 기록.
create or replace function public.tg_b2b_documents_audit()
returns trigger language plpgsql security definer as $$
begin
  -- 모든 human_review_status 전환 기록 (pending→approved, pending→rejected,
  -- approved→rejected, rejected→approved 재검토 포함)
  if NEW.human_review_status is distinct from OLD.human_review_status then
    begin
      insert into public.b2b_audit_log (account_id, action, target_type, target_id, metadata)
      values (
        NEW.account_id,
        'document_status_changed',
        'b2b_account_document',
        NEW.id,
        jsonb_build_object(
          'document_type', NEW.document_type,
          'old_status',    OLD.human_review_status,
          'new_status',    NEW.human_review_status,
          'reviewer',      NEW.human_reviewer_email,
          'trigger',       'auto'
        )
      );
    exception when others then null;
    end;
  end if;

  return NEW;
end;
$$;

drop trigger if exists tg_b2b_documents_audit on public.b2b_account_documents;
create trigger tg_b2b_documents_audit
  after update on public.b2b_account_documents
  for each row
  when (NEW.human_review_status is distinct from OLD.human_review_status)
  execute function public.tg_b2b_documents_audit();

-- ─────────────────────────────────────────────
-- 18) Supabase Storage: b2b-documents 버킷 + RLS
-- ─────────────────────────────────────────────
-- 버킷: private, 10MB 한도, JPG/PNG/PDF/WEBP 허용
-- 경로 컨벤션: {user_id}/business-license-{timestamp}.{ext}
--             {user_id}/claims/{filename}  (향후 클레임 증거 사진)
-- service_role (admin-supabase.ts) 은 RLS 우회 → 어드민 조회에 별도 policy 불필요

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'b2b-documents',
  'b2b-documents',
  false,
  10485760,  -- 10 MB
  array['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
on conflict (id) do nothing;

-- 사업자 본인: 자신의 파일만 업로드
drop policy if exists "b2b-documents: owner insert" on storage.objects;
create policy "b2b-documents: owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'b2b-documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 사업자 본인: 자신의 파일만 조회
drop policy if exists "b2b-documents: owner select" on storage.objects;
create policy "b2b-documents: owner select"
  on storage.objects for select
  using (
    bucket_id = 'b2b-documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 사업자 본인: 자신의 파일만 삭제 (재업로드 시 upsert 사용하므로 실질적으로 드문 케이스)
drop policy if exists "b2b-documents: owner delete" on storage.objects;
create policy "b2b-documents: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'b2b-documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 사업자 본인: upsert(재업로드) 시 UPDATE 실행 — policy 없으면 RLS 위반 에러 발생
drop policy if exists "b2b-documents: owner update" on storage.objects;
create policy "b2b-documents: owner update"
  on storage.objects for update
  using (
    bucket_id = 'b2b-documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'b2b-documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─────────────────────────────────────────────
-- 19) 구독 취소 방어 — discount_override_pct 컬럼
-- ─────────────────────────────────────────────
-- 취소 시도 시 "3개월 30% 할인" 오퍼 수락 → 이 컬럼에 30 저장
-- 결제 시스템이 이 값을 읽어 실제 청구 금액에 적용
alter table public.b2b_subscriptions
  add column if not exists discount_override_pct smallint
    check (discount_override_pct >= 0 and discount_override_pct <= 100);

-- ─────────────────────────────────────────────
-- 20) 플랫폼 공지 (전체 사업자 대상 방송 채널)
-- ─────────────────────────────────────────────
-- b2b_notifications 는 개별 계정 트리거 알림; b2b_announcements 는 운영팀이 전체에 방송.
-- target_plan_codes 빈 배열 = 전체 플랜 대상. starts_at ~ ends_at 기간에만 배너 표시.

create table if not exists public.b2b_announcements (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('urgent','maintenance','feature_update','general')),
  title text not null,
  body_markdown text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  target_plan_codes text[] not null default '{}',  -- 비어 있으면 전체 플랜
  send_email boolean not null default false,
  email_sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 어드민만 CRUD (service_role 경유 — RLS 우회)
alter table public.b2b_announcements enable row level security;

-- 셀러: 활성 공지 조회 허용 (인증 사용자)
drop policy if exists "b2b-announcements: authenticated select" on public.b2b_announcements;
create policy "b2b-announcements: authenticated select"
  on public.b2b_announcements for select
  using (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────
-- 섹션 20 — 마이그레이션: ai_review_status CHECK 에 'rejected' 추가
-- (Gemini recommend='reject' 권고를 'flagged' 가 아닌 'rejected' 로 구분 저장)
-- ─────────────────────────────────────────────
alter table public.b2b_account_documents
  drop constraint if exists b2b_docs_ai_status_check;

alter table public.b2b_account_documents
  add constraint b2b_docs_ai_status_check
    check (ai_review_status in ('pending','approved','flagged','rejected','failed','skipped'));

-- ─────────────────────────────────────────────
-- 21) 1:1 CS 지원 티켓 + SLA 추적
-- ─────────────────────────────────────────────
-- Phase H(1:1 문의 스키마) + Phase M(SLA 컬럼) 통합 구현.
-- SLA 24h: 생성 시 트리거로 sla_deadline_at 자동 계산.
-- 24h 초과 미응답 → Edge Function ticket-escalation 이 에스컬레이션.

create table if not exists public.b2b_support_tickets (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references public.b2b_accounts(id) on delete cascade,
  subject         text not null,
  body            text not null,
  status          text not null default 'open'
    check (status in ('open','in_progress','resolved','closed')),
  admin_reply     text,
  admin_replied_by uuid references auth.users(id) on delete set null,
  -- SLA 추적
  first_response_at  timestamptz,
  sla_deadline_at    timestamptz,  -- 생성 시각 + 24h (트리거 자동 계산)
  escalated_at       timestamptz,
  escalated_to_email text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.b2b_support_tickets enable row level security;

-- 사업자: 본인 티켓만 SELECT·INSERT
drop policy if exists "b2b-support-tickets: owner select" on public.b2b_support_tickets;
create policy "b2b-support-tickets: owner select"
  on public.b2b_support_tickets for select
  using (
    account_id in (
      select id from public.b2b_accounts where user_id = auth.uid()
    )
  );

drop policy if exists "b2b-support-tickets: owner insert" on public.b2b_support_tickets;
create policy "b2b-support-tickets: owner insert"
  on public.b2b_support_tickets for insert
  with check (
    account_id in (
      select id from public.b2b_accounts where user_id = auth.uid()
    )
  );

-- 티켓 생성 시 sla_deadline_at 자동 계산 (created_at + 24h)
create or replace function public.fn_set_ticket_sla_deadline()
returns trigger language plpgsql as $$
begin
  new.sla_deadline_at := new.created_at + interval '24 hours';
  return new;
end;
$$;

drop trigger if exists tg_ticket_sla_deadline on public.b2b_support_tickets;
create trigger tg_ticket_sla_deadline
  before insert on public.b2b_support_tickets
  for each row execute function public.fn_set_ticket_sla_deadline();

-- updated_at 자동 갱신
create or replace function public.fn_set_ticket_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tg_ticket_updated_at on public.b2b_support_tickets;
create trigger tg_ticket_updated_at
  before update on public.b2b_support_tickets
  for each row execute function public.fn_set_ticket_updated_at();

-- ─────────────────────────────────────────────
-- 22) 구독 갱신 grace period 컬럼
-- (billing-lifecycle Edge Function 이 참조)
-- ─────────────────────────────────────────────
alter table public.b2b_subscriptions
  add column if not exists grace_period_ends_at timestamptz;

alter table public.b2b_subscriptions
  add column if not exists payment_retry_count int not null default 0;

-- ─────────────────────────────────────────────
-- 23) 청약철회 고지 발송 기록 (전자상거래법 §17)
-- UNIQUE(order_id): 주문당 1회만 고지, 중복 발송 방지
-- ─────────────────────────────────────────────
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

-- 사업자: 본인 계정 고지 기록 조회 허용
drop policy if exists "b2b-withdrawal-notices: owner select" on public.b2b_withdrawal_notices;
create policy "b2b-withdrawal-notices: owner select"
  on public.b2b_withdrawal_notices for select
  using (
    account_id in (
      select id from public.b2b_accounts where user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- 24) b2b_offers.offer_accepted_at 컬럼 추가
-- (할인 오퍼 중복 수락 방어)
-- ─────────────────────────────────────────────
alter table public.b2b_offers
  add column if not exists offer_accepted_at timestamptz;
