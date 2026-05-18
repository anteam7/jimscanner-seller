-- 2026-05-18: 공용 배대지 주소 시드 — main repo 의 centers 테이블에서 변환.
-- US 40개 (표준 'street, city, state zip' 정규식 파싱) + JP 17개 (일본어 주소 통째로).
-- 멱등 실행 가능 (기존 is_official=true 시드 삭제 후 재삽입).

DELETE FROM public.b2b_forwarder_addresses WHERE account_id IS NULL AND is_official = true;

INSERT INTO public.b2b_forwarder_addresses (
  account_id, forwarder_id, label, recipient_name, address1, city, state, zip, country, is_official, notes
)
SELECT
  NULL,
  c.forwarder_id,
  f.name || ' ' || COALESCE(c.center_name, c.country_name || ' 센터'),
  '(셀러 영문이름 + 회원번호 입력 필요)',
  regexp_replace(c.address, '^(.+),\s*[^,]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\s*$', '\1'),
  regexp_replace(c.address, '^.+,\s*([^,]+),\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\s*$', '\1'),
  substring(c.address from '([A-Z]{2})\s+\d{5}(?:-\d{4})?\s*$'),
  substring(c.address from '(\d{5}(?:-\d{4})?)\s*$'),
  'US',
  true,
  CASE WHEN c.is_tax_free THEN '면세주 (no sales tax)' ELSE NULL END
FROM public.centers c
JOIN public.forwarders f ON f.id = c.forwarder_id
WHERE c.country = 'US'
  AND c.address IS NOT NULL AND c.address != ''
  AND c.address ~ '^.+,\s*[^,]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\s*$';

INSERT INTO public.b2b_forwarder_addresses (
  account_id, forwarder_id, label, recipient_name, address1, city, state, zip, country, is_official, notes
)
SELECT
  NULL,
  c.forwarder_id,
  f.name || ' ' || COALESCE(c.center_name, c.country_name || ' 센터'),
  '(셀러 영문이름 + 会員番号 입력 필요)',
  c.address,
  '',
  COALESCE(
    substring(c.address from '^(東京都|大阪府|京都府|北海道)'),
    substring(c.address from '^(.{2,3}県)'),
    ''
  ),
  '',
  'JP',
  true,
  'amazon.co.jp 결제 시 city/zip 은 본인이 별도 입력 필요. 일본어 주소 전체가 address1 에 들어있음.'
FROM public.centers c
JOIN public.forwarders f ON f.id = c.forwarder_id
WHERE c.country = 'JP'
  AND c.address IS NOT NULL AND c.address != '';
