/**
 * 카테고리별 통관 가이드 (KCS 한국관세청 자료 기반).
 * - 목록통관 한도 (개인 자가사용)
 * - 카테고리별 추가 신고·검사 의무
 * - 금지·제한 품목
 *
 * 정적 데이터 — 법규 변경 시 갱신 필요.
 */

export type CustomsGuide = {
  category: string
  label: string
  emoji: string
  list_limit_usd: number | null  // 목록통관 한도 (USD)
  notes: string                  // 핵심 주의사항
  restrictions: string[]         // 제한·금지 항목
  required_docs: string[]        // 필요 서류
  agency: string | null          // 추가 신고 필요 기관
}

export const CUSTOMS_GUIDES: CustomsGuide[] = [
  {
    category: 'food',
    label: '식품',
    emoji: '🍱',
    list_limit_usd: 150,
    notes: '식약처 신고 대상. 자가사용 한도 5kg / $150. 김치·생선 등 신선식품 금지.',
    restrictions: ['생선·육류·생채소 금지', '주류 자가사용 한 종류 1병만', '건강기능식품 6병 한도'],
    required_docs: ['수입신고서', '식약처 수입신고 확인'],
    agency: '식품의약품안전처',
  },
  {
    category: 'cosmetic',
    label: '화장품',
    emoji: '💄',
    list_limit_usd: 150,
    notes: '자가사용 한도 1인당 동일 제품 60ml × 6개. 의약외품(미백·주름) 별도 신고.',
    restrictions: ['연고·치약은 의약외품 — 별도 신고', '뷰티 디바이스(LED 등) 안전인증 필요'],
    required_docs: ['수입신고서'],
    agency: '식품의약품안전처 (의약외품)',
  },
  {
    category: 'electronics',
    label: '전자제품',
    emoji: '📱',
    list_limit_usd: 150,
    notes: 'KC 인증 (전자파·전기안전) 필요. 무선기기 (블루투스·와이파이) 적합성 인증.',
    restrictions: ['배터리 단독 운송 X (특수운송 필요)', '드론·무전기 안전인증', '의료기기 (혈압계 등) 식약처 신고'],
    required_docs: ['KC 인증 정보', '시리얼번호'],
    agency: '국립전파연구원 (KC)',
  },
  {
    category: 'clothing',
    label: '의류·잡화',
    emoji: '👕',
    list_limit_usd: 150,
    notes: '가장 단순. 가죽·모피는 CITES 협약 (멸종위기종) 주의.',
    restrictions: ['가죽 (악어·뱀·코끼리 등) CITES 증명서', '브랜드 위조품 압수'],
    required_docs: [],
    agency: null,
  },
  {
    category: 'kids',
    label: '아동·유아용품',
    emoji: '👶',
    list_limit_usd: 150,
    notes: 'KC 안전인증 필수 (장난감·유아용품). 미인증 시 통관 거부.',
    restrictions: ['만 13세 이하 장난감 KC 안전인증', '카시트 안전기준'],
    required_docs: ['KC 안전인증 정보'],
    agency: '국가기술표준원',
  },
  {
    category: 'health',
    label: '건강보조식품',
    emoji: '💊',
    list_limit_usd: 150,
    notes: '자가사용 6병 한도. 비타민·홍삼·오메가3 등 일반. 의약품은 별도.',
    restrictions: ['의약품 (처방·OTC) 금지', '대마(CBD) 금지', '환각·각성 성분 금지'],
    required_docs: [],
    agency: '식품의약품안전처',
  },
  {
    category: 'watch',
    label: '시계·명품',
    emoji: '⌚',
    list_limit_usd: 150,
    notes: '$150 초과 시 정식 통관 (관세 8%). 명품은 정품 인증서 보관 권장.',
    restrictions: ['단일품 $150 초과 시 자가사용 적용 X — 정식 신고 의무', '브랜드 정품 검증'],
    required_docs: ['구매 영수증', '정품 인증서'],
    agency: null,
  },
  {
    category: 'alcohol',
    label: '주류',
    emoji: '🍾',
    list_limit_usd: 150,
    notes: '자가사용 한 종류 1병만. 도수·용량 제한.',
    restrictions: ['1인당 1병 한정', '도수 60% 이하', '용량 1L 이하'],
    required_docs: ['수입신고서'],
    agency: '국세청',
  },
  {
    category: 'tobacco',
    label: '담배·전자담배',
    emoji: '🚬',
    list_limit_usd: 150,
    notes: '자가사용 1인당 200개비 (10갑). 전자담배 액상도 제한.',
    restrictions: ['1인당 200개비 (담배 10갑)', '전자담배 액상 50ml 한도'],
    required_docs: [],
    agency: null,
  },
  {
    category: 'home',
    label: '생활용품',
    emoji: '🏠',
    list_limit_usd: 150,
    notes: '가구·주방·청소용품 등. 전기제품 제외 KC 안전인증 일부 필요.',
    restrictions: ['아동용 침구 KC', '세제·살균제 위해우려제품 신고'],
    required_docs: [],
    agency: null,
  },
  {
    category: 'other',
    label: '기타',
    emoji: '📦',
    list_limit_usd: 150,
    notes: '카테고리 미분류. 일반 목록통관 $150 한도 적용.',
    restrictions: [],
    required_docs: [],
    agency: null,
  },
]

export function getCustomsGuide(category: string | null | undefined): CustomsGuide | null {
  if (!category) return null
  return CUSTOMS_GUIDES.find((g) => g.category === category) ?? null
}

export const CUSTOMS_CATEGORY_OPTIONS = CUSTOMS_GUIDES.map((g) => ({ value: g.category, label: `${g.emoji} ${g.label}` }))
