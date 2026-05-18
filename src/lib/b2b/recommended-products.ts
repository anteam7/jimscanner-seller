/**
 * 추천 상품 mock 데이터 — 일본·미국 트렌딩.
 * 실 어필리에이트 ID / API 연동은 v0.5+ 에서 진행.
 *
 * 가격은 2026-05 기준 실측 평균 (정확치 X — 셀러가 직접 확인해야 함).
 */

export type RecommendedProduct = {
  id: string
  name: string
  category: string
  origin: 'JP' | 'US'
  supplier_site: string
  supplier_label: string
  cost_foreign: number
  currency: 'USD' | 'JPY'
  /** 국내 마켓 평균 판매가 (KRW) — 셀러 보고용 추정치 */
  estimated_sale_krw: number
  notes: string
  thumb: string
}

export const RECOMMENDED_PRODUCTS: RecommendedProduct[] = [
  // 일본 — 라쿠텐·아마존JP
  {
    id: 'jp-cosme-shiseido-sunscreen',
    name: '시세이도 아넷사 퍼펙트 UV 선스크린',
    category: '뷰티 / 자외선차단',
    origin: 'JP',
    supplier_site: 'amazon_jp',
    supplier_label: '아마존 JP',
    cost_foreign: 2580,
    currency: 'JPY',
    estimated_sale_krw: 38000,
    notes: '한국 면세점 대비 30~40% 저렴. 5~9월 시즌 회전 빠름.',
    thumb: '☀️',
  },
  {
    id: 'jp-cosme-curel',
    name: '큐렐 인텐시브 모이스처 페이셜 크림',
    category: '뷰티 / 스킨케어',
    origin: 'JP',
    supplier_site: 'amazon_jp',
    supplier_label: '아마존 JP',
    cost_foreign: 1980,
    currency: 'JPY',
    estimated_sale_krw: 28000,
    notes: '민감성 피부용. 사계절 꾸준 판매.',
    thumb: '🧴',
  },
  {
    id: 'jp-stationery-pilot-juice',
    name: '파일럿 주스 업 0.4mm 12색 세트',
    category: '문구 / 필기구',
    origin: 'JP',
    supplier_site: 'amazon_jp',
    supplier_label: '아마존 JP',
    cost_foreign: 1850,
    currency: 'JPY',
    estimated_sale_krw: 24000,
    notes: '학생·다이어리 시즌 (1~3월) 폭증. 묶음 배송 효율 높음.',
    thumb: '✒️',
  },
  {
    id: 'jp-baby-pigeon-bottle',
    name: '피죤 모유실감 젖병 240ml',
    category: '유아 / 수유용품',
    origin: 'JP',
    supplier_site: 'rakuten',
    supplier_label: '라쿠텐',
    cost_foreign: 1380,
    currency: 'JPY',
    estimated_sale_krw: 22000,
    notes: '한국 유아 직구 베스트셀러. 단가 낮아 합배송 필수.',
    thumb: '🍼',
  },
  {
    id: 'jp-toy-bandai-figure',
    name: '반다이 캐릭터 피규어 (한정판 시리즈)',
    category: '취미 / 피규어',
    origin: 'JP',
    supplier_site: 'amazon_jp',
    supplier_label: '아마존 JP',
    cost_foreign: 4980,
    currency: 'JPY',
    estimated_sale_krw: 65000,
    notes: '한정판은 발매 후 24h 내 매입 필수. 리세일 마진 큼.',
    thumb: '🎎',
  },
  {
    id: 'jp-food-uha-mikakuto',
    name: '유하미카쿠토 콜라겐 젤리 (20개입 x 3)',
    category: '식품 / 건강기능',
    origin: 'JP',
    supplier_site: 'rakuten',
    supplier_label: '라쿠텐',
    cost_foreign: 3680,
    currency: 'JPY',
    estimated_sale_krw: 45000,
    notes: '식품 통관 시 개인통관코드 필수. 1인 6개 이하 권장.',
    thumb: '🍬',
  },
  // 미국 — 아마존 US
  {
    id: 'us-supplement-now-foods-magnesium',
    name: 'NOW Foods 마그네슘 글리시네이트 200mg 180정',
    category: '건강식품 / 비타민',
    origin: 'US',
    supplier_site: 'amazon_us',
    supplier_label: '아마존 US',
    cost_foreign: 18.99,
    currency: 'USD',
    estimated_sale_krw: 39000,
    notes: '국내 가격 대비 50%+ 저렴. 영양제 직구 카테고리 베스트.',
    thumb: '💊',
  },
  {
    id: 'us-kitchen-stanley-tumbler',
    name: 'Stanley Quencher H2.0 텀블러 40oz',
    category: '주방 / 텀블러',
    origin: 'US',
    supplier_site: 'amazon_us',
    supplier_label: '아마존 US',
    cost_foreign: 44.99,
    currency: 'USD',
    estimated_sale_krw: 85000,
    notes: 'SNS 인기 지속. 색상별 회전율 차이 큼 — 인디고/베이지 선호.',
    thumb: '🥤',
  },
  {
    id: 'us-beauty-cerave-cleanser',
    name: 'CeraVe 하이드레이팅 페이셜 클렌저 473ml',
    category: '뷰티 / 클렌징',
    origin: 'US',
    supplier_site: 'amazon_us',
    supplier_label: '아마존 US',
    cost_foreign: 14.99,
    currency: 'USD',
    estimated_sale_krw: 32000,
    notes: '대용량 + 약국 화장품 인지도 높음. 재구매율 매우 좋음.',
    thumb: '🧖',
  },
  {
    id: 'us-electronics-anker-charger',
    name: 'Anker 735 Nano II 65W 충전기',
    category: '전자 / 충전기',
    origin: 'US',
    supplier_site: 'amazon_us',
    supplier_label: '아마존 US',
    cost_foreign: 39.99,
    currency: 'USD',
    estimated_sale_krw: 72000,
    notes: '리튬 배터리 미포함 → 통관 수월. 한국 정발가 대비 35% 절감.',
    thumb: '🔌',
  },
  {
    id: 'us-baby-philips-avent',
    name: 'Philips Avent Natural 젖꼭지 (4팩)',
    category: '유아 / 수유용품',
    origin: 'US',
    supplier_site: 'amazon_us',
    supplier_label: '아마존 US',
    cost_foreign: 12.99,
    currency: 'USD',
    estimated_sale_krw: 28000,
    notes: '월령별 흐름 (M/L/Y) 재고 관리 중요.',
    thumb: '👶',
  },
  {
    id: 'us-pet-greenies-dental',
    name: 'Greenies 그리니즈 치석 제거 츄 (대형견 36개입)',
    category: '반려동물 / 간식',
    origin: 'US',
    supplier_site: 'amazon_us',
    supplier_label: '아마존 US',
    cost_foreign: 36.99,
    currency: 'USD',
    estimated_sale_krw: 78000,
    notes: '반려견 직구 베스트. 정기 구매자 비율 높음.',
    thumb: '🐕',
  },
]
