-- 2026-05-28 #auto-C
-- b2b SECURITY DEFINER 함수의 EXECUTE 권한을 의도된 호출자로 한정한다.
-- Supabase security advisor 가 anon/authenticated 에 EXECUTE 가 열려 있다고 high severity 로 플래그.
-- pg_cron / 트리거 / service_role 만 호출하면 되는 함수는 anon/authenticated/PUBLIC 모두 차단.
-- 단 b2b_marketwide_supplier_stats 는 /analytics 페이지가 로그인 세션으로 직접 .rpc() 호출하므로 authenticated 는 유지.

-- 1) b2b_auto_provision_free_subscription : b2b_accounts AFTER INSERT 트리거 — 직접 호출 X
REVOKE EXECUTE ON FUNCTION public.b2b_auto_provision_free_subscription() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.b2b_auto_provision_free_subscription() FROM anon;
REVOKE EXECUTE ON FUNCTION public.b2b_auto_provision_free_subscription() FROM authenticated;

-- 2) b2b_compute_seller_health_snapshot : pg_cron 04:00 KST 일배치
REVOKE EXECUTE ON FUNCTION public.b2b_compute_seller_health_snapshot(date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.b2b_compute_seller_health_snapshot(date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.b2b_compute_seller_health_snapshot(date) FROM authenticated;

-- 3) b2b_reset_monthly_quotas : pg_cron 월초 batch
REVOKE EXECUTE ON FUNCTION public.b2b_reset_monthly_quotas() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.b2b_reset_monthly_quotas() FROM anon;
REVOKE EXECUTE ON FUNCTION public.b2b_reset_monthly_quotas() FROM authenticated;

-- 4) b2b_marketwide_supplier_stats : authenticated 세션이 .rpc() 직접 호출 — authenticated 만 유지
REVOKE EXECUTE ON FUNCTION public.b2b_marketwide_supplier_stats(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.b2b_marketwide_supplier_stats(integer) FROM anon;
GRANT  EXECUTE ON FUNCTION public.b2b_marketwide_supplier_stats(integer) TO authenticated;
