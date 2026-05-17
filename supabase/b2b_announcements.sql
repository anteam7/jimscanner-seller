-- b2b_announcements: 운영팀이 셀러 전체에 방송하는 공지/배너
-- AnnouncementBanner 가 /api/announcements/active 호출 → 활성 공지 표시
-- 적용: Supabase MCP apply_migration (b2b_announcements_table_and_seed)

CREATE TABLE IF NOT EXISTS public.b2b_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('urgent','maintenance','feature_update','general')),
  title text NOT NULL,
  body_markdown text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  target_plan_codes text[] NOT NULL DEFAULT '{}',  -- 비어 있으면 전체 플랜
  send_email boolean NOT NULL DEFAULT false,
  email_sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_announcements_period
  ON public.b2b_announcements(starts_at, ends_at);

ALTER TABLE public.b2b_announcements ENABLE ROW LEVEL SECURITY;

-- 셀러: 활성 공지 조회 허용 (인증 사용자) — 운영팀 CRUD 는 service_role
DROP POLICY IF EXISTS "b2b-announcements: authenticated select" ON public.b2b_announcements;
CREATE POLICY "b2b-announcements: authenticated select"
  ON public.b2b_announcements FOR SELECT
  USING (auth.role() = 'authenticated');

-- 시드: 베타 운영 안내 (30일 노출)
INSERT INTO public.b2b_announcements (type, title, body_markdown, starts_at, ends_at, target_plan_codes, send_email)
VALUES (
  'general',
  '짐스캐너 SELLER 베타 운영 중',
  '현재 베타 단계입니다. 신규 기능과 안정성 보강이 계속 배포됩니다. 사용 중 발견된 이슈는 설정의 1:1 문의로 알려주세요.',
  now(),
  now() + interval '30 days',
  ARRAY[]::text[],
  false
) ON CONFLICT DO NOTHING;
