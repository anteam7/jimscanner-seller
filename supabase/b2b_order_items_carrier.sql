-- 2026-05-18: 운송장 택배사 컬럼 추가 (cron-20 / D3)
-- tracking_number 는 이미 있음. 한국 택배사 라벨 표시·트래킹 링크 생성용.

ALTER TABLE public.b2b_order_items
  ADD COLUMN IF NOT EXISTS carrier text;

COMMENT ON COLUMN public.b2b_order_items.carrier IS '국내 배송 택배사 (CJ, 한진, 로젠, 우체국 등). tracking_number 와 함께 사용';
