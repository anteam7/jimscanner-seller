// 한국 배대지 공통 배송신청서 자동 채우기 (휴리스틱).
//
// 핵심 아이디어: 모든 한국 배대지가 KCS(관세청) 표준 필드를 쓰기 때문에
// label 한글 텍스트만 매칭하면 80% 자동입력 가능. 배대지마다 selector 미리
// 수집할 필요 X.
//
// 동작:
//   1. 페이지에 form/inputs 가 있고 신청서 키워드 매칭되면 [🪄 자동 채우기] 버튼
//   2. 셀러가 짐스캐너 페이지에서 미리 "전송할 주문" 을 선택 (chrome.storage.session)
//   3. 클릭 시 각 input/select 의 label/placeholder/name/id 텍스트를 가져와 의미 추론
//   4. b2b_orders 데이터로 매핑된 input 채움
//   5. 매칭 안된 필드는 그대로 둠 (사용자 수동 입력)
//
// capture-shipping-form.js 와 같은 도메인에서 같이 동작.
// 두 버튼 모두 표시 — [📋 캡쳐] 는 짐스캐너 팀용, [🪄 자동채우기] 는 셀러 즉시 사용.

;(function () {
  if (window.__JIMSCANNER_FORM_FILLER_INJECTED__) return
  window.__JIMSCANNER_FORM_FILLER_INJECTED__ = true

  const BTN_ID = 'jimscanner-form-filler-btn'
  const PANEL_ID = 'jimscanner-form-filler-panel'

  // ─── 한글 label → 의미 필드 매핑 ─────────────────────────────────────────
  // 각 의미 필드는 b2b_orders / b2b_order_items 의 컬럼과 연결됨.
  // 정규식 형태 — label/placeholder/name 텍스트에 매칭되면 채움.
  const FIELD_PATTERNS = [
    // 수령자 (마켓 구매자) 정보
    { semantic: 'buyer_name',     patterns: [/수령자\s*명?/, /받는\s*분/, /받는사람/, /수취인/, /성명/, /이름/, /recipient/i, /receiver/i, /to.*name/i] },
    { semantic: 'buyer_phone',    patterns: [/(휴대폰|핸드폰|전화|연락처|모바일)\s*번호?/, /phone/i, /mobile/i, /tel/i] },
    { semantic: 'buyer_email',    patterns: [/이메일|email|e-?mail/i] },
    { semantic: 'buyer_zip',      patterns: [/우편번호|zip|postal/i] },
    { semantic: 'buyer_address',  patterns: [/(주소|도로명|기본주소|address)(?!2|상세)/i, /address.?line.?1/i] },
    { semantic: 'buyer_addr_detail', patterns: [/(상세주소|동\/호수|상세\s*주소|address.?line.?2|detail.*address)/i] },
    { semantic: 'buyer_customs_code', patterns: [/통관(고유)?(부호|번호)|개인통관|customs/i] },

    // 매입 상품
    { semantic: 'product_name',   patterns: [/(품명|상품(명|이름)|product.*name|item.*name)/i] },
    { semantic: 'product_name_en', patterns: [/(영문|영어)\s*(품명|상품(명|이름))/i, /english.*name/i] },
    { semantic: 'qty',            patterns: [/(수량|개수|quantity|qty)/i] },
    { semantic: 'unit_price',     patterns: [/(단가|개당|unit.*price)/i] },
    { semantic: 'total_price',    patterns: [/(금액|총\s*가격|합계|total)/i] },
    { semantic: 'currency',       patterns: [/(통화|currency)/i] },
    { semantic: 'product_url',    patterns: [/(상품|구매)?\s*(url|링크|주소)$/i, /product.*url/i, /item.*url/i] },
    { semantic: 'brand',          patterns: [/(브랜드|brand|메이커|maker)/i] },

    // 배대지 운영
    { semantic: 'tracking_number_overseas', patterns: [/(해외|미국|일본|중국)\s*(트래킹|운송장|tracking)/i, /tracking.*number/i, /송장번호/i] },
    { semantic: 'supplier_order_number', patterns: [/(매입|주문)\s*번호|order.*number|order.*id/i] },

    // 결제·기타
    { semantic: 'payment_method', patterns: [/(결제\s*수단|payment.*method)/i] },
    { semantic: 'memo',           patterns: [/(메모|특이사항|요청사항|배송\s*메모|comment|note)/i] },
  ]

  // ─── React-controlled input/select 값 설정 ──────────────────────────────
  function setReactValue(el, value) {
    if (!el || el.disabled || el.readOnly) return false
    const tag = el.tagName
    const proto =
      tag === 'SELECT' ? window.HTMLSelectElement.prototype
      : tag === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype
    const desc = Object.getOwnPropertyDescriptor(proto, 'value')
    if (desc && desc.set) desc.set.call(el, value == null ? '' : String(value))
    else el.value = value == null ? '' : String(value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }

  // ─── 페이지 감지 ────────────────────────────────────────────────────────
  const SHIPPING_KEYWORDS = [
    '배송신청', '배송 신청', '발송신청', '발송 신청',
    '신청서 작성', '배송대행 신청', '주문번호', '트래킹번호',
    '수령자', '구매자정보', '받는분', '받는 분', '국내 받는분', '운송장 입력',
  ]
  function pageHasShippingFormKeywords() {
    const bodyText = document.body?.innerText || ''
    let hits = 0
    for (const kw of SHIPPING_KEYWORDS) {
      if (bodyText.includes(kw)) hits++
      if (hits >= 2) return true
    }
    return false
  }
  function hasMeaningfulForm() {
    const allInputs = document.querySelectorAll('input, select, textarea')
    return allInputs.length >= 5
  }
  function shouldShowButton() {
    return pageHasShippingFormKeywords() && hasMeaningfulForm()
  }

  // ─── input element 의 텍스트 컨텍스트 (label + placeholder + name + id) ──
  function elementLabel(el) {
    const parts = []
    const id = el.id
    if (id) {
      const lab = document.querySelector(`label[for="${CSS.escape(id)}"]`)
      if (lab) parts.push((lab.innerText || '').trim())
    }
    const parentLabel = el.closest('label')
    if (parentLabel) parts.push((parentLabel.innerText || '').trim())
    // table 패턴: 같은 row 의 th/td:first
    const tr = el.closest('tr')
    if (tr) {
      const th = tr.querySelector('th, td:first-child')
      if (th && !th.contains(el)) parts.push((th.innerText || '').trim())
    }
    // dl 패턴: 직전 dt
    const dd = el.closest('dd')
    if (dd) {
      const dt = dd.previousElementSibling
      if (dt && dt.tagName === 'DT') parts.push((dt.innerText || '').trim())
    }
    // 위 형제 text 의 가까운 텍스트
    const placeholder = el.getAttribute('placeholder') || ''
    const name = el.getAttribute('name') || ''
    const ariaLabel = el.getAttribute('aria-label') || ''
    return [parts.join(' '), placeholder, name, id, ariaLabel].filter(Boolean).join(' | ').toLowerCase()
  }

  function classifyField(el) {
    const ctx = elementLabel(el)
    if (!ctx) return null
    for (const { semantic, patterns } of FIELD_PATTERNS) {
      for (const p of patterns) {
        if (p.test(ctx)) return semantic
      }
    }
    return null
  }

  // ─── order data → semantic 필드 값 ──────────────────────────────────────
  function orderToValues(order, item) {
    // order: b2b_orders row, item: b2b_order_items 의 첫 라인 (다라인은 사용자가 수동 처리)
    return {
      buyer_name: order.buyer_name,
      buyer_phone: order.buyer_phone,
      buyer_email: null,
      buyer_zip: order.buyer_postal_code,
      buyer_address: order.buyer_address,
      buyer_addr_detail: order.buyer_detail_address,
      buyer_customs_code: order.buyer_customs_code,
      product_name: item?.product_name,
      product_name_en: item?.product_name_en,
      qty: item?.qty,
      unit_price: item?.unit_price_foreign,
      total_price: item && item.qty && item.unit_price_foreign
        ? Number(item.qty) * Number(item.unit_price_foreign)
        : null,
      currency: item?.currency,
      product_url: item?.product_url,
      brand: item?.brand,
      tracking_number_overseas: item?.tracking_number_overseas,
      supplier_order_number: item?.supplier_order_number,
      payment_method: null, // 셀러가 직접
      memo: order.memo,
    }
  }

  function fillForm(values) {
    const inputs = Array.from(document.querySelectorAll('input, select, textarea'))
    const result = { filled: [], skipped: [], total: inputs.length }
    for (const el of inputs) {
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') continue
      const semantic = classifyField(el)
      if (!semantic) {
        result.skipped.push({ name: el.name || el.id || '(unnamed)' })
        continue
      }
      const value = values[semantic]
      if (value == null || value === '') continue
      // select 는 option 텍스트로 매칭
      if (el.tagName === 'SELECT') {
        const tgt = String(value).toLowerCase()
        let matched = false
        for (const opt of el.options) {
          if (opt.value.toLowerCase() === tgt || (opt.textContent || '').trim().toLowerCase() === tgt) {
            setReactValue(el, opt.value)
            matched = true
            break
          }
        }
        if (matched) result.filled.push({ semantic, name: el.name || el.id })
      } else {
        setReactValue(el, value)
        result.filled.push({ semantic, name: el.name || el.id })
      }
    }
    return result
  }

  // ─── UI ────────────────────────────────────────────────────────────────
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
    )
  }

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID)
    if (panel) return panel
    panel = document.createElement('div')
    panel.id = PANEL_ID
    panel.style.cssText = [
      'position:fixed', 'bottom:80px', 'right:200px', 'z-index:2147483646',
      'width:360px', 'max-height:520px', 'overflow:hidden',
      'border-radius:12px', 'background:white',
      'border:1px solid #e2e8f0', 'box-shadow:0 20px 40px rgba(15,23,42,0.2)',
      'font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      'color:#0f172a', 'font-size:12px', 'line-height:1.5',
      'display:flex', 'flex-direction:column',
    ].join(';')
    document.body.appendChild(panel)
    return panel
  }
  function renderPanel(content) { ensurePanel().innerHTML = content }
  function closePanel() { document.getElementById(PANEL_ID)?.remove() }

  async function openPanel() {
    renderPanel(`<div style="padding:24px 16px;text-align:center;color:#475569">주문 불러오는 중…</div>`)
    let result
    try {
      result = await chrome.runtime.sendMessage({ type: 'JIMSCANNER_FETCH_ORDERS' })
    } catch (err) {
      result = { ok: false, error: String(err && err.message ? err.message : err) }
    }
    if (!result || result.ok === false) {
      renderPanel(`
        <div style="padding:14px 16px;background:#fff1f2;border-bottom:1px solid #fecdd3;color:#b91c1c;font-weight:600">주문 조회 실패</div>
        <div style="padding:14px 16px;color:#475569;font-size:11px">${escapeHtml((result && result.error) || '')}</div>
        <div style="padding:10px 16px;border-top:1px solid #f1f5f9;text-align:right">
          <button id="jsx-fill-close" style="font-size:11px;color:#475569;background:white;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;cursor:pointer">닫기</button>
        </div>
      `)
      document.getElementById('jsx-fill-close')?.addEventListener('click', closePanel)
      return
    }
    const orders = result.orders || []
    if (orders.length === 0) {
      renderPanel(`
        <div style="padding:14px 16px;border-bottom:1px solid #f1f5f9">
          <div style="font-weight:700;color:#0f172a">자동 채우기</div>
        </div>
        <div style="padding:24px 16px;color:#475569;font-size:11px;text-align:center">
          채울 주문이 없습니다.<br/>
          짐스캐너 /orders 에서 주문을 등록한 후 이 페이지로 돌아와 다시 시도하세요.
        </div>
        <div style="padding:10px 16px;border-top:1px solid #f1f5f9;text-align:right">
          <button id="jsx-fill-close" style="font-size:11px;color:#475569;background:white;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;cursor:pointer">닫기</button>
        </div>
      `)
      document.getElementById('jsx-fill-close')?.addEventListener('click', closePanel)
      return
    }
    renderOrderList(orders)
  }

  function renderOrderList(orders) {
    const items = orders.slice(0, 30).map((o) => `
      <li data-id="${escapeHtml(o.id)}" class="jsx-fill-order" style="border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background 120ms">
        <div style="padding:10px 14px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;flex-wrap:wrap">
            <span style="font-size:11px;font-weight:700;color:#0f172a">${escapeHtml(o.market_order_number || o.order_number || '주문')}</span>
            ${o.marketplace ? `<span style="font-size:10px;color:#4338ca;background:#eef2ff;border:1px solid #c7d2fe;padding:1px 5px;border-radius:3px">${escapeHtml(o.marketplace)}</span>` : ''}
            <span style="font-size:10px;color:#64748b">${escapeHtml(o.status || '')}</span>
          </div>
          <div style="font-size:11px;color:#475569">${escapeHtml(o.buyer_name || '구매자 없음')} · ${escapeHtml(o.first_product || '상품 없음')}</div>
          <div style="font-size:10px;color:#94a3b8;margin-top:2px">${escapeHtml(o.forwarder_name || '배대지 미지정')}</div>
        </div>
      </li>
    `).join('')
    renderPanel(`
      <div style="padding:14px 16px;border-bottom:1px solid #f1f5f9">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="font-weight:700;color:#0f172a">🪄 자동 채울 주문 선택</div>
          <button id="jsx-fill-close" style="font-size:18px;color:#94a3b8;background:none;border:none;cursor:pointer;line-height:1">×</button>
        </div>
        <div style="margin-top:4px;font-size:11px;color:#64748b">
          한글 label 휴리스틱으로 매칭 — 배대지별 selector 학습 X. 못 채운 필드는 직접 입력하세요.
        </div>
      </div>
      <ul style="margin:0;padding:0;list-style:none;overflow-y:auto;flex:1">${items}</ul>
      <div style="padding:8px 16px;border-top:1px solid #f1f5f9;font-size:10px;color:#94a3b8;background:#f8fafc;text-align:center">
        주문 추가: <a href="https://jimscanner-seller.vercel.app/orders/new" target="_blank" style="color:#4f46e5">/orders/new</a>
      </div>
    `)
    document.getElementById('jsx-fill-close')?.addEventListener('click', closePanel)
    document.querySelectorAll('.jsx-fill-order').forEach((li) => {
      li.addEventListener('mouseenter', () => (li.style.background = '#f8fafc'))
      li.addEventListener('mouseleave', () => (li.style.background = ''))
      li.addEventListener('click', () => {
        const id = li.getAttribute('data-id')
        const picked = orders.find((o) => o.id === id)
        if (picked) applyFill(picked)
      })
    })
  }

  function applyFill(order) {
    const item = (order.items && order.items[0]) || null
    const values = orderToValues(order, item)
    const result = fillForm(values)
    const filledHtml = result.filled.map((f) => `<li>${escapeHtml(f.semantic)} → ${escapeHtml(f.name)}</li>`).join('')
    renderPanel(`
      <div style="padding:14px 16px;background:#ecfdf5;border-bottom:1px solid #a7f3d0;color:#047857">
        <b>✓ ${result.filled.length}개 필드 자동 채움</b>
        <div style="margin-top:4px;font-size:11px">총 ${result.total}개 입력 중 ${result.filled.length}개 매칭</div>
      </div>
      <div style="padding:14px 16px;color:#475569;flex:1;overflow-y:auto;font-size:11px">
        <details style="margin-bottom:8px"><summary style="cursor:pointer;color:#4f46e5">채워진 필드 ${result.filled.length}개</summary><ul style="margin:6px 0 0 18px;padding:0;font-size:10px;color:#475569">${filledHtml || '<li style="color:#94a3b8">없음</li>'}</ul></details>
        <p style="margin:0;color:#64748b">못 채운 필드는 페이지에서 직접 확인 후 입력하세요. 매칭이 부정확하면 짐스캐너 /settings/forwarder-forms 에 [📋] 캡쳐 후 알려주시면 정확한 매핑 추가합니다.</p>
      </div>
      <div style="padding:10px 16px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;gap:6px">
        <button id="jsx-fill-back" style="font-size:11px;color:#475569;background:white;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;cursor:pointer">다른 주문</button>
        <button id="jsx-fill-close" style="font-size:11px;color:white;background:#059669;border:none;border-radius:6px;padding:6px 14px;cursor:pointer">완료</button>
      </div>
    `)
    document.getElementById('jsx-fill-close')?.addEventListener('click', closePanel)
    document.getElementById('jsx-fill-back')?.addEventListener('click', openPanel)
    console.log('[Jimscanner] 자동 채우기 결과:', result)
  }

  // ─── 버튼 ───────────────────────────────────────────────────────────────
  function createButton() {
    if (document.getElementById(BTN_ID)) return
    const btn = document.createElement('button')
    btn.id = BTN_ID
    btn.type = 'button'
    btn.textContent = '🪄 자동 채우기'
    // 캡쳐 버튼(우하단)과 겹치지 않게 그 왼쪽
    btn.style.cssText = [
      'position:fixed', 'bottom:20px', 'right:230px', 'z-index:2147483647',
      'padding:10px 16px', 'border:none', 'border-radius:999px',
      'background:#059669', 'color:white', 'font-weight:600', 'font-size:12px',
      'letter-spacing:-0.005em', 'cursor:pointer',
      'box-shadow:0 6px 20px rgba(5,150,105,0.35)',
      'font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      'transition:background 120ms',
    ].join(';')
    btn.addEventListener('mouseenter', () => { btn.style.background = '#047857' })
    btn.addEventListener('mouseleave', () => { btn.style.background = '#059669' })
    btn.addEventListener('click', openPanel)
    document.body.appendChild(btn)
  }

  function tryShow() {
    if (shouldShowButton()) createButton()
  }

  tryShow()
  let lastUrl = location.href
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      document.getElementById(BTN_ID)?.remove()
      closePanel()
      setTimeout(tryShow, 1500)
    } else if (!document.getElementById(BTN_ID)) {
      tryShow()
    }
  }, 5000)
})()
