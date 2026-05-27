-- 2026-05-18: 구독 월간 쿼터 리셋 (cron-28 / G2)
-- 매일 UTC 00:05 (KST 09:05) 에 pg_cron 으로 호출. period_end 가 지난 row 만 처리 → 매일 돌려도 idempotent.

CREATE OR REPLACE FUNCTION public.b2b_reset_monthly_quotas()
RETURNS TABLE(reset_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.b2b_subscriptions
    SET
      monthly_order_used = 0,
      period_start = date_trunc('month', v_now),
      period_end = date_trunc('month', v_now) + interval '1 month'
    WHERE period_end IS NOT NULL
      AND period_end <= v_now
    RETURNING id
  )
  SELECT count(*)::integer INTO v_count FROM updated;
  RETURN QUERY SELECT v_count;
END;
$$;

COMMENT ON FUNCTION public.b2b_reset_monthly_quotas IS
  '구독 월간 쿼터 리셋. period_end 가 지난 row 만 처리 (매일 호출해도 idempotent). pg_cron 으로 매일 UTC 00:05 (KST 09:05) 실행.';

-- pg_cron 등록 (기존 동명 unschedule 후 재등록 — 재실행 안전)
DO $$
BEGIN
  PERFORM cron.unschedule('b2b_reset_monthly_quotas_daily')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'b2b_reset_monthly_quotas_daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'b2b_reset_monthly_quotas_daily',
  '5 0 * * *',
  $$SELECT public.b2b_reset_monthly_quotas();$$
);

-- pg_cron / service_role 전용 — PUBLIC/anon/authenticated EXECUTE 차단 (#auto-C 2026-05-28)
REVOKE EXECUTE ON FUNCTION public.b2b_reset_monthly_quotas() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.b2b_reset_monthly_quotas() FROM anon;
REVOKE EXECUTE ON FUNCTION public.b2b_reset_monthly_quotas() FROM authenticated;
