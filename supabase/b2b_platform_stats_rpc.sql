-- B2B 플랫폼 운영 통계 RPC
-- /api/admin/stats route 에서 service_role 경유 호출

create or replace function public.get_admin_platform_stats(period_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_start timestamptz := now() - (period_days || ' days')::interval;
  v_today_start  timestamptz := date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
  v_prev_start   timestamptz := v_period_start - (period_days || ' days')::interval;
  v_result       jsonb;
begin
  select jsonb_build_object(
    -- 전체 가입자
    'total_accounts',        (select count(*) from b2b_accounts where deleted_at is null),
    -- 오늘 신규 가입
    'new_today',             (select count(*) from b2b_accounts where deleted_at is null and created_at >= v_today_start),
    -- 기간 내 신규 가입
    'new_in_period',         (select count(*) from b2b_accounts where deleted_at is null and created_at >= v_period_start),
    -- 전 기간 신규 (증감 계산용)
    'new_in_prev_period',    (select count(*) from b2b_accounts where deleted_at is null and created_at >= v_prev_start and created_at < v_period_start),
    -- 검수 대기
    'pending_review',        (select count(*) from b2b_accounts where deleted_at is null and verification_status = 'document_pending_review'),
    -- 승인된 계정
    'approved_accounts',     (select count(*) from b2b_accounts where deleted_at is null and verification_status in ('document_approved','fully_verified')),
    -- 거절된 계정
    'rejected_accounts',     (select count(*) from b2b_accounts where deleted_at is null and verification_status = 'document_rejected'),
    -- 정지 계정
    'suspended_accounts',    (select count(*) from b2b_accounts where deleted_at is null and verification_status = 'suspended'),
    -- 플랜별 분포 (active 구독 기준)
    'plan_distribution',     (
      select jsonb_object_agg(p.plan_code, cnt)
      from (
        select sp.plan_code, count(*) as cnt
        from b2b_subscriptions s
        join b2b_subscription_plans sp on sp.id = s.plan_id
        where s.status in ('active','trial')
        group by sp.plan_code
      ) p
    ),
    -- 기간 내 새 구독 (active)
    'new_subscriptions_in_period', (
      select count(*) from b2b_subscriptions
      where status in ('active','trial') and created_at >= v_period_start
    ),
    -- 열린 문의 (b2b_support_tickets 미생성 시 0)
    'open_tickets',          0::bigint
  ) into v_result;

  return v_result;
end;
$$;

comment on function public.get_admin_platform_stats(int) is
  'B2B 플랫폼 운영 현황 집계. period_days: 집계 기간(일). 기본 30일.';
