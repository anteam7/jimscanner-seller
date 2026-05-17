/**
 * 주문 도메인 dropdown 옵션의 단일 source of truth.
 * - 단건 입력 (NewOrderForm), 일괄 입력 (BulkOrderClient), 목록 필터 (orders/page),
 *   상세 (orders/[id]/page) 가 모두 여기를 import 한다.
 * - value 는 enum (DB 저장), label 은 사용자 노출 표기.
 */

export type Currency = 'USD' | 'JPY' | 'CNY' | 'EUR' | 'KRW' | 'GBP' | 'HKD'

export const CURRENCIES: { code: Currency; label: string }[] = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'JPY', label: 'JPY (¥)' },
  { code: 'CNY', label: 'CNY (¥)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'HKD', label: 'HKD (HK$)' },
  { code: 'KRW', label: 'KRW (₩)' },
]

export const MARKETPLACES: { value: string; label: string }[] = [
  { value: 'coupang', label: '쿠팡' },
  { value: 'smartstore', label: '스마트스토어' },
  { value: 'auction', label: '옥션' },
  { value: 'gmarket', label: '지마켓' },
  { value: '11st', label: '11번가' },
  { value: 'interpark', label: '인터파크' },
  { value: 'wemakeprice', label: '위메프' },
  { value: 'tmon', label: '티몬' },
  { value: 'kakao_gift', label: '카카오 선물하기' },
  { value: 'own_mall', label: '자사몰' },
  { value: 'kakao_channel', label: '카카오 채널' },
  { value: 'instagram', label: '인스타그램' },
  { value: 'other', label: '기타' },
]

export const SUPPLIER_SITES: { value: string; label: string }[] = [
  { value: 'amazon_us', label: '미국 아마존' },
  { value: 'amazon_jp', label: '일본 아마존' },
  { value: 'amazon_de', label: '독일 아마존' },
  { value: 'amazon_uk', label: '영국 아마존' },
  { value: 'amazon_ca', label: '캐나다 아마존' },
  { value: 'rakuten_jp', label: '라쿠텐' },
  { value: 'yahoo_jp', label: '야후 재팬' },
  { value: 'mercari_jp', label: '메루카리' },
  { value: 'zozotown', label: 'ZOZOTOWN' },
  { value: 'taobao', label: '타오바오' },
  { value: 'tmall', label: '티몰' },
  { value: 'aliexpress', label: '알리익스프레스' },
  { value: 'jd', label: '징동(JD)' },
  { value: 'pinduoduo', label: '핀둬둬' },
  { value: 'ebay', label: 'eBay' },
  { value: 'walmart', label: 'Walmart' },
  { value: 'target', label: 'Target' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'lazada', label: 'Lazada' },
  { value: 'farfetch', label: 'Farfetch' },
  { value: 'ssense', label: 'SSENSE' },
  { value: 'matchesfashion', label: 'Matches Fashion' },
  { value: 'mytheresa', label: 'Mytheresa' },
  { value: 'other', label: '기타' },
]

export const SUPPLIER_COUNTRIES: { value: string; label: string }[] = [
  { value: 'US', label: '미국 (US)' },
  { value: 'JP', label: '일본 (JP)' },
  { value: 'CN', label: '중국 (CN)' },
  { value: 'DE', label: '독일 (DE)' },
  { value: 'UK', label: '영국 (UK)' },
  { value: 'HK', label: '홍콩 (HK)' },
  { value: 'OTHER', label: '기타' },
]

export const MARKETPLACE_LABEL = new Map(MARKETPLACES.map((m) => [m.value, m.label]))
export const SUPPLIER_SITE_LABEL = new Map(SUPPLIER_SITES.map((s) => [s.value, s.label]))
