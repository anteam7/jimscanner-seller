-- 기록: 2026-05-28 #auto-F
-- b2b_form_template_columns multiple_permissive_policies 통합
--
-- 문제:
--   template_columns_select (FOR SELECT) 와 template_columns_modify (FOR ALL)
--   가 SELECT 시 동시 평가 → Supabase advisor 0008 (multiple_permissive_policies)
--   5건 (anon / authenticated / authenticator / dashboard_user / supabase_privileged_role).
--
-- 해결:
--   template_columns_modify (FOR ALL) 삭제 후 INSERT/UPDATE/DELETE 3개 정책으로 split.
--   SELECT 는 template_columns_select 한 곳에서만 평가.
--   의미·target role (public) 보존. auth.uid() 는 initplan 패턴 (SELECT auth.uid()) 유지.
--
-- 검증:
--   apply 후 pg_policies → 4개 정책 (delete/insert/select/update).
--   advisor multiple_permissive_policies → b2b_form_template_columns 5건 → 0건.

DROP POLICY IF EXISTS "template_columns_modify" ON public.b2b_form_template_columns;

CREATE POLICY "template_columns_insert" ON public.b2b_form_template_columns
  FOR INSERT TO public
  WITH CHECK (template_id IN (
    SELECT id FROM public.b2b_form_templates
    WHERE owner_account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid()))
  ));

CREATE POLICY "template_columns_update" ON public.b2b_form_template_columns
  FOR UPDATE TO public
  USING (template_id IN (
    SELECT id FROM public.b2b_form_templates
    WHERE owner_account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid()))
  ))
  WITH CHECK (template_id IN (
    SELECT id FROM public.b2b_form_templates
    WHERE owner_account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid()))
  ));

CREATE POLICY "template_columns_delete" ON public.b2b_form_template_columns
  FOR DELETE TO public
  USING (template_id IN (
    SELECT id FROM public.b2b_form_templates
    WHERE owner_account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid()))
  ));
