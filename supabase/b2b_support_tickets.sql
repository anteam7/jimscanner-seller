-- 2026-05-18: 셀러 1:1 문의 (cron-23 / E3)
-- 티켓 + 메시지 스레드. 어드민 답변은 service_role 로 작성 (메인 repo 의 /admin/support).

CREATE TABLE IF NOT EXISTS public.b2b_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.b2b_accounts(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'open',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT b2b_support_tickets_status_chk CHECK (status IN ('open','answered','closed'))
);

CREATE INDEX IF NOT EXISTS idx_b2b_support_tickets_account
  ON public.b2b_support_tickets(account_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.b2b_support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.b2b_support_tickets(id) ON DELETE CASCADE,
  sender text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT b2b_support_messages_sender_chk CHECK (sender IN ('seller','admin'))
);

CREATE INDEX IF NOT EXISTS idx_b2b_support_messages_ticket
  ON public.b2b_support_messages(ticket_id, created_at ASC);

ALTER TABLE public.b2b_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_select_own ON public.b2b_support_tickets;
CREATE POLICY support_tickets_select_own ON public.b2b_support_tickets
  FOR SELECT TO authenticated
  USING (
    account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS support_tickets_insert_own ON public.b2b_support_tickets;
CREATE POLICY support_tickets_insert_own ON public.b2b_support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    account_id IN (SELECT id FROM public.b2b_accounts WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS support_messages_select_own ON public.b2b_support_messages;
CREATE POLICY support_messages_select_own ON public.b2b_support_messages
  FOR SELECT TO authenticated
  USING (
    ticket_id IN (
      SELECT t.id FROM public.b2b_support_tickets t
      JOIN public.b2b_accounts a ON a.id = t.account_id
      WHERE a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS support_messages_insert_seller ON public.b2b_support_messages;
CREATE POLICY support_messages_insert_seller ON public.b2b_support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender = 'seller'
    AND ticket_id IN (
      SELECT t.id FROM public.b2b_support_tickets t
      JOIN public.b2b_accounts a ON a.id = t.account_id
      WHERE a.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.b2b_support_tickets IS '셀러 1:1 문의 티켓. 어드민은 service_role 로 답변 작성.';
COMMENT ON COLUMN public.b2b_support_tickets.category IS 'general | billing | technical | account | other';
COMMENT ON COLUMN public.b2b_support_tickets.status IS 'open (셀러 마지막) | answered (어드민 마지막) | closed';
