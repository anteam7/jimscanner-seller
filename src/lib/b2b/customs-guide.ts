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

export const CUSTOMS_CATEGORIES = CUSTOMS_GUIDES.map((g) => g.category)

export function isValidCustomsCategory(v: unknown): v is string {
  return typeof v === 'string' && CUSTOMS_CATEGORIES.includes(v)
}

/**
 * 카테고리별 키워드 사전 (한·영·일). 상품명에서 통관 카테고리를 자동 인식하는 데 사용.
 * 'other' 는 매칭 대상에서 제외 (fallback) — 명시 키워드가 없으면 매칭 안 됨 = null.
 */
export const CUSTOMS_KEYWORDS: Record<string, string[]> = {
  food: [
    '식품', '음식', '과자', '초콜릿', '초콜렛', '커피', '라면', '소스', '향신료', '꿀',
    '시리얼', '캔디', '젤리', '분유', '이유식', '간식', '견과', '올리브유', '스낵',
    'food', 'snack', 'chocolate', 'coffee', 'candy', 'cookie', 'sauce', 'honey', 'cereal', 'noodle', 'olive oil',
    'お菓子', 'チョコ', 'コーヒー', '食品', '飴', 'クッキー', 'スナック',
  ],
  cosmetic: [
    '화장품', '스킨', '로션', '크림', '세럼', '앰플', '마스크팩', '립스틱', '파운데이션',
    '쿠션', '선크림', '자외선차단', '향수', '네일', '매니큐어', '아이섀도', '비비크림', '토너', '에센스',
    'cosmetic', 'skincare', 'lotion', 'cream', 'serum', 'lipstick', 'foundation', 'perfume', 'sunscreen', 'mascara', 'toner', 'essence',
    '化粧品', 'スキンケア', 'クリーム', '香水', '口紅', '日焼け止め', '美容液',
  ],
  electronics: [
    '전자', '가전', '노트북', '컴퓨터', '키보드', '마우스', '이어폰', '헤드폰', '스피커',
    '충전기', '배터리', '카메라', '드론', '태블릿', '모니터', '블루투스', '스마트워치', '게임기', '콘솔', '공유기', '셋톱',
    'electronic', 'laptop', 'headphone', 'earphone', 'earbud', 'charger', 'battery', 'camera', 'drone', 'tablet', 'monitor', 'keyboard', 'mouse', 'speaker', 'console', 'airpods',
    '家電', 'イヤホン', 'カメラ', '充電器', 'バッテリー', 'パソコン', 'スピーカー',
  ],
  clothing: [
    '의류', '셔츠', '티셔츠', '바지', '청바지', '자켓', '재킷', '코트', '니트', '원피스',
    '스커트', '운동화', '스니커즈', '구두', '가방', '지갑', '벨트', '모자', '양말', '후드', '패딩', '맨투맨',
    'clothing', 'shirt', 'pants', 'jeans', 'jacket', 'coat', 'dress', 'shoes', 'sneaker', 'bag', 'wallet', 'hat', 'socks', 'hoodie', 'jumper',
    '服', 'シャツ', '靴', 'バッグ', '財布', 'スニーカー', 'ジャケット',
  ],
  kids: [
    '유아', '아동', '어린이', '장난감', '완구', '기저귀', '젖병', '유모차', '카시트', '아기',
    '블록', '인형', '보행기', '치발기', '아기띠',
    'kids', 'baby', 'toy', 'diaper', 'stroller', 'carseat', 'infant', 'lego', 'doll',
    'おもちゃ', 'ベビー', '子供', 'おむつ', '人形',
  ],
  health: [
    '영양제', '비타민', '오메가', '홍삼', '프로바이오틱', '유산균', '콜라겐', '단백질', '보충제',
    '루테인', '마그네슘', '글루코사민', '밀크씨슬', '아연',
    'supplement', 'vitamin', 'omega', 'probiotic', 'collagen', 'protein', 'lutein', 'magnesium', 'glucosamine',
    'サプリ', 'ビタミン', '健康', 'プロテイン', 'コラーゲン',
  ],
  watch: [
    '시계', '명품', '롤렉스', '목걸이', '반지', '귀걸이', '주얼리', '보석', '다이아', '팔찌', '브로치',
    'watch', 'rolex', 'jewelry', 'jewellery', 'necklace', 'ring', 'earring', 'luxury', 'diamond', 'bracelet',
    '時計', 'ジュエリー', 'ネックレス', '指輪', 'ブレスレット',
  ],
  alcohol: [
    '주류', '와인', '위스키', '맥주', '보드카', '사케', '샴페인', '리큐르', '브랜디', '데낄라', '데킬라',
    'alcohol', 'wine', 'whisky', 'whiskey', 'beer', 'vodka', 'sake', 'champagne', 'brandy', 'tequila', 'liqueur',
    '酒', 'ワイン', 'ウイスキー', 'ビール', '日本酒', 'シャンパン',
  ],
  tobacco: [
    '담배', '전자담배', '액상', '연초', '시가', '니코틴', '궐련',
    'tobacco', 'cigarette', 'vape', 'cigar', 'nicotine', 'e-liquid',
    'たばこ', 'タバコ', '電子タバコ', 'リキッド',
  ],
  home: [
    '주방', '가구', '침구', '수건', '이불', '베개', '냄비', '프라이팬', '청소', '세제',
    '텀블러', '그릇', '식기', '수납', '커튼', '러그', '조명', '디퓨저',
    'kitchen', 'furniture', 'bedding', 'towel', 'pillow', 'pot', 'pan', 'cleaning', 'detergent', 'tumbler', 'cookware', 'cutlery', 'curtain', 'diffuser',
    '家具', 'キッチン', '寝具', 'タオル', '食器',
  ],
}

/**
 * 상품명에서 통관 카테고리 자동 인식.
 * 가장 긴 (= 가장 구체적인) 매칭 키워드를 우선. 매칭 없으면 null.
 */
export function matchCustomsCategory(
  text: string | null | undefined,
): { category: string; keyword: string } | null {
  if (!text) return null
  const hay = text.toLowerCase()
  let best: { category: string; keyword: string; len: number } | null = null
  for (const [category, words] of Object.entries(CUSTOMS_KEYWORDS)) {
    for (const w of words) {
      const lw = w.toLowerCase()
      if (hay.includes(lw) && (!best || lw.length > best.len)) {
        best = { category, keyword: w, len: lw.length }
      }
    }
  }
  return best ? { category: best.category, keyword: best.keyword } : null
}
