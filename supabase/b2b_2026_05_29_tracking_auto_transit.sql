-- #idea-8 운송장 자동 트래킹 hub — 2026-05-29
-- 적용: Supabase MCP apply_migration `b2b_order_items_tracking_updated_at_auto_transit`
--
-- 변경:
-- 1. b2b_order_items.tracking_updated_at timestamptz 컬럼 추가
-- 2. tg_b2b_order_items_tracking_auto_transit() 트리거 함수
--    - 라인의 tracking_number_overseas 가 비어있다가 처음 입력될 때:
--      a) NEW.tracking_updated_at = now() 자동 set
--      b) 부모 b2b_orders.status 가 'paid' 면 'in_transit' 으로 자동 전이
-- 3. BEFORE INSERT OR UPDATE OF tracking_number_overseas 트리거 등록
-- 4. 기존 데이터 backfill: tracking_number_overseas 있는 라인의 tracking_updated_at 채움

ALTER TABLE b2b_order_items
  ADD COLUMN IF NOT EXISTS tracking_updated_at timestamptz;

COMMENT ON COLUMN b2b_order_items.tracking_updated_at IS '현지 트래킹 (tracking_number_overseas) 마지막 갱신 시각. 트리거가 자동 set.';

CREATE OR REPLACE FUNCTION public.tg_b2b_order_items_tracking_auto_transit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_first_entry boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.tracking_number_overseas IS NOT NULL AND length(btrim(NEW.tracking_number_overseas)) > 0 THEN
      NEW.tracking_updated_at := now();
      v_first_entry := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.tracking_number_overseas IS DISTINCT FROM OLD.tracking_number_overseas THEN
      IF NEW.tracking_number_overseas IS NOT NULL AND length(btrim(NEW.tracking_number_overseas)) > 0 THEN
        NEW.tracking_updated_at := now();
        IF OLD.tracking_number_overseas IS NULL OR length(btrim(OLD.tracking_number_overseas)) = 0 THEN
          v_first_entry := true;
        END IF;
      END IF;
    END IF;
  END IF;

  IF v_first_entry THEN
    UPDATE b2b_orders
       SET status = 'in_transit',
           updated_at = now()
     WHERE id = NEW.order_id
       AND status = 'paid';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tg_b2b_order_items_tracking_auto_transit() FROM PUBLIC;

DROP TRIGGER IF EXISTS tg_b2b_order_items_tracking_auto_transit ON b2b_order_items;
CREATE TRIGGER tg_b2b_order_items_tracking_auto_transit
BEFORE INSERT OR UPDATE OF tracking_number_overseas ON b2b_order_items
FOR EACH ROW
EXECUTE FUNCTION public.tg_b2b_order_items_tracking_auto_transit();

UPDATE b2b_order_items
   SET tracking_updated_at = COALESCE(updated_at, now())
 WHERE tracking_number_overseas IS NOT NULL
   AND length(btrim(tracking_number_overseas)) > 0
   AND tracking_updated_at IS NULL;
