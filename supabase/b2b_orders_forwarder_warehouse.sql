-- ============================================================================
-- 짐스캐너 B2B — 배대지 창고 컬럼 추가 (2026-05-16)
--
-- 일괄 입력 기능 위한 배대지 sub-entity. 같은 배대지 안에 여러 창고(센터)가
-- 있을 수 있음 (예: 몰테일 NJ/DE/CA, 짐패스 OR/NJ). 33 양식 변환 시
-- 출발지/창고별 양식이 달라지는 경우 사용.
--
-- 정규화는 v0.5+ 에서 forwarder_warehouses 테이블로 분리 가능.
-- v0 에선 자유 텍스트 컬럼으로 간단히.
--
-- 적용 상태: prod (obxvucyhzlakensopalf) 에 직접 적용 완료 (2026-05-16)
-- ============================================================================

alter table public.b2b_orders
  add column if not exists forwarder_warehouse text;

comment on column public.b2b_orders.forwarder_warehouse is
  '배대지 내 창고/센터 코드 또는 이름 (예: 몰테일 NJ, 짐패스 OR). 33 양식 변환 시 출발지 정보로 사용.';
