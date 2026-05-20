// 배대지 배송신청서 페이지의 폼 종류를 판별.
//
// 폼 종류:
//   - 'combined': 통합형 (SHIPPING + PURCHASE 둘 다 한 페이지). 짐패스 통합 신청서 등
//   - 'shipping_only': 분리형 배송지 입력 단계
//   - 'purchase_only': 분리형 매입 정보 입력 단계
//   - 'none': 배송신청서 아님 / 충분한 input 없음
//
// 휴리스틱 (조정 가능):
//   - shipping match ≥ 2 AND purchase match ≥ 2 → combined
//   - shipping match ≥ 2 only → shipping_only
//   - purchase match ≥ 2 only → purchase_only
//   - 둘 다 < 2 → none
//
// field-patterns.js 가 먼저 로드되어 있어야 함 (window.__JIMSCANNER_FIELD_PATTERNS__).

;(function () {
  function getPatternsModule() {
    return window.__JIMSCANNER_FIELD_PATTERNS__
  }

  function scanPage() {
    const mod = getPatternsModule()
    if (!mod) return { shipping: [], purchase: [], unmatched: [], totalInputs: 0 }
    const inputs = Array.from(document.querySelectorAll('input, select, textarea'))
      .filter((el) => el.type !== 'hidden' && el.type !== 'submit' && el.type !== 'button' && el.type !== 'reset')
    const shipping = []
    const purchase = []
    const unmatched = []
    for (const el of inputs) {
      const { kind, semantic } = mod.classifyField(el)
      if (kind === 'shipping') shipping.push({ el, semantic })
      else if (kind === 'purchase') purchase.push({ el, semantic })
      else unmatched.push({ el })
    }
    return { shipping, purchase, unmatched, totalInputs: inputs.length }
  }

  // 폼 종류 판별
  function classifyForm() {
    const scan = scanPage()
    // 의미 필드 카운트는 unique semantic 으로 (한 페이지에 같은 의미 중복 input 있을 수 있음)
    const shipSems = new Set(scan.shipping.map((m) => m.semantic))
    const purSems = new Set(scan.purchase.map((m) => m.semantic))
    let kind = 'none'
    if (shipSems.size >= 2 && purSems.size >= 2) kind = 'combined'
    else if (shipSems.size >= 2) kind = 'shipping_only'
    else if (purSems.size >= 2) kind = 'purchase_only'
    return {
      kind,
      shippingFields: scan.shipping,
      purchaseFields: scan.purchase,
      shippingSemantics: Array.from(shipSems),
      purchaseSemantics: Array.from(purSems),
      totalInputs: scan.totalInputs,
    }
  }

  const KIND_LABEL = {
    combined: '통합형 (배송지 + 매입정보)',
    shipping_only: '배송지 입력 단계',
    purchase_only: '매입 정보 입력 단계',
    none: '배송신청서 아님',
  }

  window.__JIMSCANNER_FIELD_CLASSIFIER__ = {
    scanPage,
    classifyForm,
    KIND_LABEL,
  }
})()
