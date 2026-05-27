-- Migration: pin search_path on b2b trigger functions
-- Applied: 2026-05-28 (Supabase MCP apply_migration: b2b_trigger_functions_set_search_path)
-- Reason: Supabase security advisor function_search_path_mutable (WARN)
--   불변 search_path 가 없으면 caller 가 search_path 를 임의 schema 로 바꿔서
--   동명 함수 호출을 가로챌 수 있음 (스키마 hijack)
-- Source-of-truth: 원본 CREATE FUNCTION 정의는 b2b_schema.sql, b2b_form_templates.sql,
--   b2b_products.sql 에 SET search_path 가 inline 으로 들어가도록 동기화됨
ALTER FUNCTION public.tg_b2b_touch_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.tg_b2b_form_templates_set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.tg_b2b_products_set_updated_at() SET search_path = public, pg_temp;
