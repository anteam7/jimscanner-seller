// 한국 배대지 배송신청서의 필드 패턴.
// 두 카테고리로 분리:
//   - SHIPPING: 마켓 구매자 (수령자) 정보 — /orders 의 buyer_* 에서 가져옴
//   - PURCHASE: 해외 매입 정보 — /imports 영수증 또는 /orders 의 line items 에서 가져옴
//
// 배대지 폼 종류:
//   - 통합형 (combined): 한 페이지에 SHIPPING + PURCHASE 둘 다
//   - 분리형 배송 (shipping_only): SHIPPING 만
//   - 분리형 매입 (purchase_only): PURCHASE 만
//
// 분류는 label/placeholder/name/id 의 한글 텍스트 패턴 매칭.

;(function () {
  const SHIPPING_PATTERNS = [
    { semantic: 'buyer_name',         patterns: [/수령자\s*명?/, /받는\s*분/, /받는사람/, /수취인/, /실수령자/, /구매자\s*(성명|이름)/, /recipient/i, /receiver/i] },
    { semantic: 'buyer_phone',        patterns: [/(휴대폰|핸드폰|전화|연락처|모바일)\s*번호?/, /수령자\s*(연락|전화)/, /receiver.*phone/i, /\bphone\b/i, /\bmobile\b/i, /\btel\b/i] },
    { semantic: 'buyer_postal_code',  patterns: [/우편번호|zip|postal/i] },
    { semantic: 'buyer_address',      patterns: [/(?<!상세\s*)(도로명\s*주소|기본\s*주소|배송지\s*주소|수령지\s*주소|address(?!.*line.?2)(?!.*detail))/i] },
    { semantic: 'buyer_detail_address', patterns: [/(상세\s*주소|동\s*호수|동\/호수|address.?line.?2|detail.*address)/i] },
    { semantic: 'buyer_customs_code', patterns: [/통관(고유)?(부호|번호)|개인통관|customs(.*code)?/i, /개통\s*번호/i] },
  ]

  const PURCHASE_PATTERNS = [
    { semantic: 'product_name',         patterns: [/(품명|상품(\s*)(명|이름)|product.*name|item.*name|model.*name)/i] },
    { semantic: 'product_name_en',      patterns: [/(영문|영어)\s*(품명|상품(\s*)(명|이름))/i, /english.*(name|product)/i] },
    { semantic: 'qty',                  patterns: [/(수량|개수|입수|quantity|\bqty\b)/i] },
    { semantic: 'unit_price',           patterns: [/(단가|개당|unit.*price|item.*price)/i] },
    { semantic: 'total_price',          patterns: [/(상품\s*금액|총\s*가격|합계|상품가|구매\s*가격|구매\s*금액|total.*price|amount)/i] },
    { semantic: 'currency',             patterns: [/(통화|currency)/i] },
    { semantic: 'product_url',          patterns: [/(상품|구매|판매)\s*(url|링크|주소)$/i, /(product|item).*url/i] },
    { semantic: 'brand',                patterns: [/(브랜드|brand|메이커|maker|제조사)/i] },
    { semantic: 'supplier_order_number', patterns: [/(매입|구매|해외|쇼핑몰)?\s*주문\s*번호|order.*number|order.*id/i] },
    { semantic: 'tracking_number_overseas', patterns: [/(해외|미국|일본|중국|현지)\s*(트래킹|운송장|tracking)|tracking.*number|송장\s*번호|배송\s*번호/i] },
    { semantic: 'supplier_site',        patterns: [/(매입처|쇼핑몰|구매\s*사이트|판매처)|store.*name/i] },
  ]

  // input 의 컨텍스트 텍스트 (label + placeholder + name + id + aria-label + th)
  function elementContext(el) {
    const parts = []
    const id = el.id
    if (id) {
      const lab = document.querySelector(`label[for="${CSS.escape(id)}"]`)
      if (lab) parts.push((lab.innerText || '').trim())
    }
    const parentLabel = el.closest('label')
    if (parentLabel) parts.push((parentLabel.innerText || '').trim())
    const tr = el.closest('tr')
    if (tr) {
      const th = tr.querySelector('th, td:first-child')
      if (th && !th.contains(el)) parts.push((th.innerText || '').trim())
    }
    const dd = el.closest('dd')
    if (dd) {
      const dt = dd.previousElementSibling
      if (dt && dt.tagName === 'DT') parts.push((dt.innerText || '').trim())
    }
    parts.push(el.getAttribute('placeholder') || '')
    parts.push(el.getAttribute('name') || '')
    parts.push(el.id || '')
    parts.push(el.getAttribute('aria-label') || '')
    return parts.filter(Boolean).join(' | ').toLowerCase()
  }

  // 의미 필드 분류: returns { kind: 'shipping'|'purchase'|null, semantic }
  function classifyField(el) {
    const ctx = elementContext(el)
    if (!ctx) return { kind: null, semantic: null }
    for (const { semantic, patterns } of SHIPPING_PATTERNS) {
      for (const p of patterns) {
        if (p.test(ctx)) return { kind: 'shipping', semantic }
      }
    }
    for (const { semantic, patterns } of PURCHASE_PATTERNS) {
      for (const p of patterns) {
        if (p.test(ctx)) return { kind: 'purchase', semantic }
      }
    }
    return { kind: null, semantic: null }
  }

  window.__JIMSCANNER_FIELD_PATTERNS__ = {
    SHIPPING_PATTERNS,
    PURCHASE_PATTERNS,
    elementContext,
    classifyField,
  }
})()
