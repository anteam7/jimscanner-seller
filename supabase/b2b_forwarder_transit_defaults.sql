-- B2B 배대지 운송일수 lookup
-- ETA = order_date(or forwarder_submitted_at) + avg_transit_days
-- 셀러가 마켓 구매자에게 "언제 도착해요?" 답변용 기준값.
-- 글로벌 시드 (서비스 공통). 셀러별 override 는 향후 컬럼 추가.

CREATE TABLE IF NOT EXISTS public.b2b_forwarder_transit_defaults (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  origin_country text NOT NULL,
  method text NOT NULL DEFAULT 'air',
  avg_transit_days integer NOT NULL CHECK (avg_transit_days BETWEEN 1 AND 90),
  min_transit_days integer CHECK (min_transit_days >= 1),
  max_transit_days integer CHECK (max_transit_days <= 90),
  notes text,
  source text NOT NULL DEFAULT 'seed',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (origin_country, method)
);

CREATE INDEX IF NOT EXISTS idx_b2b_forwarder_transit_defaults_country
  ON public.b2b_forwarder_transit_defaults (origin_country, method)
  WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.tg_b2b_forwarder_transit_defaults_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_b2b_forwarder_transit_defaults_touch_t ON public.b2b_forwarder_transit_defaults;
CREATE TRIGGER tg_b2b_forwarder_transit_defaults_touch_t
  BEFORE UPDATE ON public.b2b_forwarder_transit_defaults
  FOR EACH ROW EXECUTE FUNCTION public.tg_b2b_forwarder_transit_defaults_touch();

ALTER TABLE public.b2b_forwarder_transit_defaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transit_defaults_read ON public.b2b_forwarder_transit_defaults;
CREATE POLICY transit_defaults_read ON public.b2b_forwarder_transit_defaults
  FOR SELECT TO authenticated, anon
  USING (is_active = true);

-- 시드 (issue#5 첨부 xlsx 5개 + 일반 air/boat 평균)
INSERT INTO public.b2b_forwarder_transit_defaults
  (origin_country, method, avg_transit_days, min_transit_days, max_transit_days, notes, source)
VALUES
  ('US', 'air',     6,  4,  8, '미국 → 한국 항공',                 'seed'),
  ('US', 'boat',   35, 28, 45, '미국 → 한국 선편 (LCL)',          'seed'),
  ('US', 'express', 4,  3,  6, '미국 → 한국 특송',                'seed'),
  ('JP', 'air',     4,  2,  6, '일본 → 한국 항공',                'seed'),
  ('JP', 'boat',   10,  7, 14, '일본 → 한국 선편',                'seed'),
  ('JP', 'ems',     5,  3,  7, '일본 EMS',                        'seed'),
  ('CN', 'air',     4,  3,  6, '중국 → 한국 항공',                'seed'),
  ('CN', 'boat',    7,  5, 10, '중국 → 한국 선편 (단거리)',       'seed'),
  ('CN', 'express', 3,  2,  5, '중국 → 한국 특송',                'seed'),
  ('UK', 'air',     8,  6, 12, '영국 → 한국 항공',                'seed'),
  ('DE', 'air',     8,  6, 12, '독일 → 한국 항공',                'seed'),
  ('FR', 'air',     8,  6, 12, '프랑스 → 한국 항공',              'seed'),
  ('IT', 'air',     9,  7, 13, '이탈리아 → 한국 항공',            'seed'),
  ('ES', 'air',     9,  7, 13, '스페인 → 한국 항공',              'seed'),
  ('AU', 'air',     7,  5, 10, '호주 → 한국 항공',                'seed'),
  ('CA', 'air',     7,  5, 10, '캐나다 → 한국 항공',              'seed'),
  ('HK', 'air',     3,  2,  5, '홍콩 → 한국 항공',                'seed'),
  ('TW', 'air',     3,  2,  5, '대만 → 한국 항공',                'seed'),
  ('SG', 'air',     5,  3,  7, '싱가포르 → 한국 항공',            'seed'),
  ('VN', 'air',     5,  3,  7, '베트남 → 한국 항공',              'seed'),
  ('TH', 'air',     5,  3,  7, '태국 → 한국 항공',                'seed'),
  ('OTHER', 'air', 10,  5, 21, '기타 국가 보수적 기본값',         'seed')
ON CONFLICT (origin_country, method) DO NOTHING;

COMMENT ON TABLE public.b2b_forwarder_transit_defaults IS
  'B2B ETA 계산용 lookup: 국가·운송수단별 평균 운송일수. ETA 페이지·캘린더 export 의 source-of-truth.';
