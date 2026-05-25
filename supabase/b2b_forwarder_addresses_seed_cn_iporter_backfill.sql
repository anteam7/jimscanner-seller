-- 2026-05-25: CN 시드 보강 — 아이포터 상하이/칭다오 2개 누락 row 백필.
-- centers.address 가 null 인 경우라 placeholder, 추후 공식 사이트 보고 보강.
INSERT INTO b2b_forwarder_addresses (
  forwarder_id, country, label, recipient_name, phone, address1, city, state, zip, member_no, is_official, notes
)
SELECT
  c.forwarder_id, 'CN',
  f.name || ' ' || c.center_name,
  '(셀러 中文이름 + 会员号 입력 필요)',
  c.default_phone,
  COALESCE(c.address, ''),
  CASE WHEN c.center_name LIKE '%상하이%' THEN '上海市'
       WHEN c.center_name LIKE '%칭다오%' THEN '青岛市' ELSE '' END,
  CASE WHEN c.center_name LIKE '%상하이%' THEN ''
       WHEN c.center_name LIKE '%칭다오%' THEN '山东省' ELSE '' END,
  '', NULL, true,
  '센터 주소는 공식 사이트 확인 후 보강 예정'
FROM centers c JOIN forwarders f ON f.id = c.forwarder_id
WHERE c.country = 'CN' AND f.name = '아이포터'
  AND NOT EXISTS (
    SELECT 1 FROM b2b_forwarder_addresses a
    WHERE a.forwarder_id = c.forwarder_id
      AND a.country = 'CN' AND a.is_official = true
      AND a.label = f.name || ' ' || c.center_name
  );
