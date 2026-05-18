-- 2026-05-18: 셀러 알림 센터 (cron-22 / E2)
-- 종 아이콘 dropdown + /notifications 페이지.
-- 생성은 service_role 백엔드/트리거가 담당 (셀러는 SELECT/UPDATE read_at 만).

CREATE TABLE IF NOT EXISTS public.b2b_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.b2b_accounts(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_notifications_account_created
  ON public.b2b_notifications(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_b2b_notifications_account_unread
  ON public.b2b_notifications(account_id, read_at)
  WHERE read_at IS NULL;

ALTER TABLE public.b2b_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.b2b_notifications;
CREATE POLICY notifications_select_own ON public.b2b_notifications
  FOR SELECT TO authenticated
  USING (
    account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS notifications_update_own ON public.b2b_notifications;
CREATE POLICY notifications_update_own ON public.b2b_notifications
  FOR UPDATE TO authenticated
  USING (
    account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = auth.uid())
  );

COMMENT ON TABLE public.b2b_notifications IS '셀러 알림 — 종 아이콘 dropdown + /notifications 페이지. 생성은 service_role 백엔드/트리거 전담.';
COMMENT ON COLUMN public.b2b_notifications.type IS 'order_status_change | system_announcement | billing | exchange_rate_alert | margin_warning | etc.';
COMMENT ON COLUMN public.b2b_notifications.link IS '클릭 시 이동할 내부 경로 (/orders/[id] 등). nullable.';
