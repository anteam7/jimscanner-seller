-- 2026-05-25: QA 발견 H-2 해소 — 신규 가입 직후 default Free 구독 자동 생성.
-- 회원가입 후 dashboard "구독 정보 없음" / billing 빈 상태 노출 방지.
-- idempotent: 이미 구독 있으면 skip.

CREATE OR REPLACE FUNCTION public.b2b_auto_provision_free_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  free_plan_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM b2b_subscriptions WHERE account_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT id INTO free_plan_id
  FROM b2b_subscription_plans
  WHERE plan_code = 'free' AND is_active = true
  LIMIT 1;

  IF free_plan_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO b2b_subscriptions (
    account_id, plan_id, status, period_start, period_end, monthly_order_used
  ) VALUES (
    NEW.id, free_plan_id, 'active',
    date_trunc('month', now()),
    date_trunc('month', now()) + interval '1 month',
    0
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS b2b_accounts_auto_free_sub ON b2b_accounts;
CREATE TRIGGER b2b_accounts_auto_free_sub
AFTER INSERT ON b2b_accounts
FOR EACH ROW
EXECUTE FUNCTION public.b2b_auto_provision_free_subscription();

-- backfill: 기존 accounts 중 구독 없는 row
INSERT INTO b2b_subscriptions (account_id, plan_id, status, period_start, period_end, monthly_order_used)
SELECT a.id,
       (SELECT id FROM b2b_subscription_plans WHERE plan_code='free' AND is_active=true LIMIT 1),
       'active',
       date_trunc('month', now()),
       date_trunc('month', now()) + interval '1 month',
       0
FROM b2b_accounts a
WHERE a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM b2b_subscriptions s WHERE s.account_id = a.id);

-- 트리거 전용 함수 — PUBLIC/anon/authenticated EXECUTE 차단 (#auto-C 2026-05-28)
REVOKE EXECUTE ON FUNCTION public.b2b_auto_provision_free_subscription() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.b2b_auto_provision_free_subscription() FROM anon;
REVOKE EXECUTE ON FUNCTION public.b2b_auto_provision_free_subscription() FROM authenticated;
