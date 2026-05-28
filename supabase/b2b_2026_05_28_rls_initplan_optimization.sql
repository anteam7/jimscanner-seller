-- 2026-05-28: #auto-E — b2b RLS auth.uid() initplan 최적화
--
-- Supabase performance advisor `auth_rls_initplan` 51건 해결:
--   row-by-row evaluate 되는 `auth.uid()` / `auth.role()` / `auth.jwt()` 호출을
--   `(SELECT auth.uid())` 식으로 감싸 query plan 1회 evaluation.
--
-- 정책의 의미·target role 은 그대로 유지, qual/with_check 표현만 (SELECT ...) wrap.
--
-- 안전성: 같은 의미·같은 row 셋. 단순 DROP + 동일 정책 재생성. service_role 은 BYPASSRLS.

BEGIN;

-- ====================================================================
-- b2b_accounts
-- ====================================================================
DROP POLICY IF EXISTS "b2b_accounts owner select" ON public.b2b_accounts;
CREATE POLICY "b2b_accounts owner select" ON public.b2b_accounts
  FOR SELECT TO public
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "b2b_accounts owner update" ON public.b2b_accounts;
CREATE POLICY "b2b_accounts owner update" ON public.b2b_accounts
  FOR UPDATE TO public
  USING (user_id = (SELECT auth.uid()));

-- ====================================================================
-- b2b_account_terms_consent
-- ====================================================================
DROP POLICY IF EXISTS "b2b_consent owner select" ON public.b2b_account_terms_consent;
CREATE POLICY "b2b_consent owner select" ON public.b2b_account_terms_consent
  FOR SELECT TO public
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_account_documents
-- ====================================================================
DROP POLICY IF EXISTS "b2b_documents owner select" ON public.b2b_account_documents;
CREATE POLICY "b2b_documents owner select" ON public.b2b_account_documents
  FOR SELECT TO public
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_subscriptions
-- ====================================================================
DROP POLICY IF EXISTS "b2b_subscriptions owner select" ON public.b2b_subscriptions;
CREATE POLICY "b2b_subscriptions owner select" ON public.b2b_subscriptions
  FOR SELECT TO public
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_clients
-- ====================================================================
DROP POLICY IF EXISTS "b2b_clients tenant rw" ON public.b2b_clients;
CREATE POLICY "b2b_clients tenant rw" ON public.b2b_clients
  FOR ALL TO public
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_orders
-- ====================================================================
DROP POLICY IF EXISTS "b2b_orders tenant rw" ON public.b2b_orders;
CREATE POLICY "b2b_orders tenant rw" ON public.b2b_orders
  FOR ALL TO public
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_order_items
-- ====================================================================
DROP POLICY IF EXISTS "b2b_order_items tenant rw" ON public.b2b_order_items;
CREATE POLICY "b2b_order_items tenant rw" ON public.b2b_order_items
  FOR ALL TO public
  USING (order_id IN (
    SELECT id FROM public.b2b_orders
    WHERE account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid()))
  ))
  WITH CHECK (order_id IN (
    SELECT id FROM public.b2b_orders
    WHERE account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid()))
  ));

-- ====================================================================
-- b2b_form_templates
-- ====================================================================
DROP POLICY IF EXISTS "templates_select" ON public.b2b_form_templates;
CREATE POLICY "templates_select" ON public.b2b_form_templates
  FOR SELECT TO public
  USING (
    owner_account_id IS NULL
    OR owner_account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "templates_insert" ON public.b2b_form_templates;
CREATE POLICY "templates_insert" ON public.b2b_form_templates
  FOR INSERT TO public
  WITH CHECK (owner_account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "templates_update" ON public.b2b_form_templates;
CREATE POLICY "templates_update" ON public.b2b_form_templates
  FOR UPDATE TO public
  USING (owner_account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "templates_delete" ON public.b2b_form_templates;
CREATE POLICY "templates_delete" ON public.b2b_form_templates
  FOR DELETE TO public
  USING (owner_account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_form_template_columns
-- ====================================================================
DROP POLICY IF EXISTS "template_columns_select" ON public.b2b_form_template_columns;
CREATE POLICY "template_columns_select" ON public.b2b_form_template_columns
  FOR SELECT TO public
  USING (template_id IN (
    SELECT id FROM public.b2b_form_templates
    WHERE owner_account_id IS NULL
       OR owner_account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid()))
  ));

-- modify 는 INSERT/UPDATE/DELETE 분리 (SELECT 중복 평가 회피 — multiple_permissive_policies)
DROP POLICY IF EXISTS "template_columns_modify" ON public.b2b_form_template_columns;
DROP POLICY IF EXISTS "template_columns_insert" ON public.b2b_form_template_columns;
CREATE POLICY "template_columns_insert" ON public.b2b_form_template_columns
  FOR INSERT TO public
  WITH CHECK (template_id IN (
    SELECT id FROM public.b2b_form_templates
    WHERE owner_account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid()))
  ));

DROP POLICY IF EXISTS "template_columns_update" ON public.b2b_form_template_columns;
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

DROP POLICY IF EXISTS "template_columns_delete" ON public.b2b_form_template_columns;
CREATE POLICY "template_columns_delete" ON public.b2b_form_template_columns
  FOR DELETE TO public
  USING (template_id IN (
    SELECT id FROM public.b2b_form_templates
    WHERE owner_account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid()))
  ));

-- ====================================================================
-- b2b_forwarder_mappings
-- ====================================================================
DROP POLICY IF EXISTS "b2b_forwarder_mappings tenant rw" ON public.b2b_forwarder_mappings;
CREATE POLICY "b2b_forwarder_mappings tenant rw" ON public.b2b_forwarder_mappings
  FOR ALL TO public
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_shipments
-- ====================================================================
DROP POLICY IF EXISTS "b2b_shipments tenant rw" ON public.b2b_shipments;
CREATE POLICY "b2b_shipments tenant rw" ON public.b2b_shipments
  FOR ALL TO public
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_audit_log
-- ====================================================================
DROP POLICY IF EXISTS "b2b_audit owner select" ON public.b2b_audit_log;
CREATE POLICY "b2b_audit owner select" ON public.b2b_audit_log
  FOR SELECT TO public
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_notifications
-- ====================================================================
DROP POLICY IF EXISTS "notifications_select_own" ON public.b2b_notifications;
CREATE POLICY "notifications_select_own" ON public.b2b_notifications
  FOR SELECT TO authenticated
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "notifications_update_own" ON public.b2b_notifications;
CREATE POLICY "notifications_update_own" ON public.b2b_notifications
  FOR UPDATE TO authenticated
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_products
-- ====================================================================
DROP POLICY IF EXISTS "products_owner" ON public.b2b_products;
CREATE POLICY "products_owner" ON public.b2b_products
  FOR ALL TO public
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_product_market_links
-- ====================================================================
DROP POLICY IF EXISTS "product_market_links_owner" ON public.b2b_product_market_links;
CREATE POLICY "product_market_links_owner" ON public.b2b_product_market_links
  FOR ALL TO public
  USING (product_id IN (
    SELECT id FROM public.b2b_products
    WHERE account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid()))
  ))
  WITH CHECK (product_id IN (
    SELECT id FROM public.b2b_products
    WHERE account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid()))
  ));

-- ====================================================================
-- b2b_product_supplier_links
-- ====================================================================
DROP POLICY IF EXISTS "product_supplier_links_owner" ON public.b2b_product_supplier_links;
CREATE POLICY "product_supplier_links_owner" ON public.b2b_product_supplier_links
  FOR ALL TO public
  USING (product_id IN (
    SELECT id FROM public.b2b_products
    WHERE account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid()))
  ))
  WITH CHECK (product_id IN (
    SELECT id FROM public.b2b_products
    WHERE account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid()))
  ));

-- ====================================================================
-- b2b_announcements
-- ====================================================================
DROP POLICY IF EXISTS "b2b-announcements: authenticated select" ON public.b2b_announcements;
CREATE POLICY "b2b-announcements: authenticated select" ON public.b2b_announcements
  FOR SELECT TO public
  USING ((SELECT auth.role()) = 'authenticated');

-- ====================================================================
-- b2b_support_tickets
-- ====================================================================
DROP POLICY IF EXISTS "support_tickets_select_own" ON public.b2b_support_tickets;
CREATE POLICY "support_tickets_select_own" ON public.b2b_support_tickets
  FOR SELECT TO authenticated
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "support_tickets_insert_own" ON public.b2b_support_tickets;
CREATE POLICY "support_tickets_insert_own" ON public.b2b_support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_support_messages
-- ====================================================================
DROP POLICY IF EXISTS "support_messages_select_own" ON public.b2b_support_messages;
CREATE POLICY "support_messages_select_own" ON public.b2b_support_messages
  FOR SELECT TO authenticated
  USING (ticket_id IN (
    SELECT t.id FROM public.b2b_support_tickets t
    JOIN public.b2b_accounts a ON a.id = t.account_id
    WHERE a.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "support_messages_insert_seller" ON public.b2b_support_messages;
CREATE POLICY "support_messages_insert_seller" ON public.b2b_support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender = 'seller'
    AND ticket_id IN (
      SELECT t.id FROM public.b2b_support_tickets t
      JOIN public.b2b_accounts a ON a.id = t.account_id
      WHERE a.user_id = (SELECT auth.uid())
    )
  );

-- ====================================================================
-- b2b_supplier_purchases
-- ====================================================================
DROP POLICY IF EXISTS "supplier_purchases_select_own" ON public.b2b_supplier_purchases;
CREATE POLICY "supplier_purchases_select_own" ON public.b2b_supplier_purchases
  FOR SELECT TO authenticated
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "supplier_purchases_update_own" ON public.b2b_supplier_purchases;
CREATE POLICY "supplier_purchases_update_own" ON public.b2b_supplier_purchases
  FOR UPDATE TO authenticated
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "supplier_purchases_delete_own" ON public.b2b_supplier_purchases;
CREATE POLICY "supplier_purchases_delete_own" ON public.b2b_supplier_purchases
  FOR DELETE TO authenticated
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_seller_tokens
-- ====================================================================
DROP POLICY IF EXISTS "seller_tokens_select_own" ON public.b2b_seller_tokens;
CREATE POLICY "seller_tokens_select_own" ON public.b2b_seller_tokens
  FOR SELECT TO authenticated
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_forwarder_addresses
-- ====================================================================
DROP POLICY IF EXISTS "forwarder_addresses_select" ON public.b2b_forwarder_addresses;
CREATE POLICY "forwarder_addresses_select" ON public.b2b_forwarder_addresses
  FOR SELECT TO authenticated
  USING (
    account_id IS NULL
    OR account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "forwarder_addresses_insert" ON public.b2b_forwarder_addresses;
CREATE POLICY "forwarder_addresses_insert" ON public.b2b_forwarder_addresses
  FOR INSERT TO authenticated
  WITH CHECK (
    is_official = false
    AND account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "forwarder_addresses_update" ON public.b2b_forwarder_addresses;
CREATE POLICY "forwarder_addresses_update" ON public.b2b_forwarder_addresses
  FOR UPDATE TO authenticated
  USING (
    is_official = false
    AND account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "forwarder_addresses_delete" ON public.b2b_forwarder_addresses;
CREATE POLICY "forwarder_addresses_delete" ON public.b2b_forwarder_addresses
  FOR DELETE TO authenticated
  USING (
    is_official = false
    AND account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid()))
  );

-- ====================================================================
-- b2b_forwarder_form_snapshots
-- ====================================================================
DROP POLICY IF EXISTS "form_snapshots_select" ON public.b2b_forwarder_form_snapshots;
CREATE POLICY "form_snapshots_select" ON public.b2b_forwarder_form_snapshots
  FOR SELECT TO authenticated
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "form_snapshots_insert" ON public.b2b_forwarder_form_snapshots;
CREATE POLICY "form_snapshots_insert" ON public.b2b_forwarder_form_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "form_snapshots_delete" ON public.b2b_forwarder_form_snapshots;
CREATE POLICY "form_snapshots_delete" ON public.b2b_forwarder_form_snapshots
  FOR DELETE TO authenticated
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_domestic_products
-- ====================================================================
DROP POLICY IF EXISTS "domestic_products_select" ON public.b2b_domestic_products;
CREATE POLICY "domestic_products_select" ON public.b2b_domestic_products
  FOR SELECT TO authenticated
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "domestic_products_insert" ON public.b2b_domestic_products;
CREATE POLICY "domestic_products_insert" ON public.b2b_domestic_products
  FOR INSERT TO authenticated
  WITH CHECK (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "domestic_products_update" ON public.b2b_domestic_products;
CREATE POLICY "domestic_products_update" ON public.b2b_domestic_products
  FOR UPDATE TO authenticated
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "domestic_products_delete" ON public.b2b_domestic_products;
CREATE POLICY "domestic_products_delete" ON public.b2b_domestic_products
  FOR DELETE TO authenticated
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_product_mappings
-- ====================================================================
DROP POLICY IF EXISTS "product_mappings_select" ON public.b2b_product_mappings;
CREATE POLICY "product_mappings_select" ON public.b2b_product_mappings
  FOR SELECT TO authenticated
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "product_mappings_insert" ON public.b2b_product_mappings;
CREATE POLICY "product_mappings_insert" ON public.b2b_product_mappings
  FOR INSERT TO authenticated
  WITH CHECK (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "product_mappings_delete" ON public.b2b_product_mappings;
CREATE POLICY "product_mappings_delete" ON public.b2b_product_mappings
  FOR DELETE TO authenticated
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_supplier_purchases_audit
-- ====================================================================
DROP POLICY IF EXISTS "supplier_purchases_audit_select" ON public.b2b_supplier_purchases_audit;
CREATE POLICY "supplier_purchases_audit_select" ON public.b2b_supplier_purchases_audit
  FOR SELECT TO authenticated
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_supplier_purchase_matches
-- ====================================================================
DROP POLICY IF EXISTS "supplier_matches_select" ON public.b2b_supplier_purchase_matches;
CREATE POLICY "supplier_matches_select" ON public.b2b_supplier_purchase_matches
  FOR SELECT TO authenticated
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "supplier_matches_insert" ON public.b2b_supplier_purchase_matches;
CREATE POLICY "supplier_matches_insert" ON public.b2b_supplier_purchase_matches
  FOR INSERT TO authenticated
  WITH CHECK (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "supplier_matches_delete" ON public.b2b_supplier_purchase_matches;
CREATE POLICY "supplier_matches_delete" ON public.b2b_supplier_purchase_matches
  FOR DELETE TO authenticated
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_seller_health_snapshot
-- ====================================================================
DROP POLICY IF EXISTS "seller_health_select_own" ON public.b2b_seller_health_snapshot;
CREATE POLICY "seller_health_select_own" ON public.b2b_seller_health_snapshot
  FOR SELECT TO authenticated
  USING (account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = (SELECT auth.uid())));

-- ====================================================================
-- b2b_auto_runs
-- ====================================================================
DROP POLICY IF EXISTS "b2b_auto_runs_admin_select" ON public.b2b_auto_runs;
CREATE POLICY "b2b_auto_runs_admin_select" ON public.b2b_auto_runs
  FOR SELECT TO authenticated
  USING (((SELECT auth.jwt()) ->> 'email') = 'anseunghyok@gmail.com');

COMMIT;
