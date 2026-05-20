// 한국 배대지 배송신청서 자동 채우기 — v0.3 (도메인 모델 정합).
//
// 데이터 흐름:
//   [국내 마켓 주문 (/orders)] ──── buyer_* = 수령자 (배송지)
//       │
//       ├── 매칭 ──> [매입 영수증 (/imports)] ─── 해외 매입 정보
//       │
//       └─> [배대지 배송신청서] (이 스크립트가 자동 채움)
//             ├ SHIPPING 부분: order.buyer.* 사용
//             └ PURCHASE 부분: matched_receipts[0] 우선, 없으면 order.items[0]
//
// 폼 종류 판별 (field-classifier.js):
//   combined: 통합형 — SHIPPING + PURCHASE 둘 다 채움
//   shipping_only: 분리형 배송 단계 — SHIPPING 만
//   purchase_only: 분리형 매입 단계 — PURCHASE 만
//
// 의존:
//   - field-patterns.js (먼저 로드)
//   - field-classifier.js (먼저 로드)

;(function () {
  if (window.__JIMSCANNER_FORM_FILLER_INJECTED__) return
  window.__JIMSCANNER_FORM_FILLER_INJECTED__ = true

  const BTN_ID = 'jimscanner-form-filler-btn'
  const PANEL_ID = 'jimscanner-form-filler-panel'

  function getPatternsModule() { return window.__JIMSCANNER_FIELD_PATTERNS__ }
  function getClassifierModule() { return window.__JIMSCANNER_FIELD_CLASSIFIER__ }

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

  function setSelectValue(el, value) {
    const tgt = String(value).toLowerCase().trim()
    for (const opt of el.options) {
      if (opt.value.toLowerCase() === tgt || (opt.textContent || '').trim().toLowerCase() === tgt) {
        setReactValue(el, opt.value)
        return true
      }
    }
    return false
  }

  function fillFieldByValue(el, value) {
    if (value == null || value === '') return false
    if (el.tagName === 'SELECT') return setSelectValue(el, value)
    setReactValue(el, value)
    return true
  }

  // ─── 의미 필드 → 실제 값 매핑 ────────────────────────────────────────────
  // order: API 응답의 한 order. order.buyer / order.items / order.matched_receipts
  function buildValueMap(order) {
    const item = (order.items && order.items[0]) || {}
    const receipt = (order.matched_receipts && order.matched_receipts[0]) || null
    const receiptItem = receipt && Array.isArray(receipt.items) && receipt.items[0] ? receipt.items[0] : null

    // PURCHASE 우선순위: receipt 데이터가 더 정확 (자동 수집), 없으면 line item
    const productName = (receiptItem && receiptItem.name) || item.product_name || null
    const productUrl = (receiptItem && receiptItem.product_url) || item.product_url || null
    const qty = (receiptItem && receiptItem.qty) || item.qty || null
    const unitPrice = (receiptItem && receiptItem.unit_price) || item.unit_price_foreign || null
    const currency = (receipt && receipt.currency) || item.currency || null
    const totalPrice = qty && unitPrice ? Number(qty) * Number(unitPrice) : (receipt && receipt.total_foreign) || null
    const supplierOrderNumber = (receipt && receipt.supplier_order_number) || item.supplier_order_number || null
    const supplierSite = item.supplier_site || (receipt && receipt.source) || null

    return {
      // SHIPPING (buyer)
      buyer_name: order.buyer?.name,
      buyer_phone: order.buyer?.phone,
      buyer_postal_code: order.buyer?.postal_code,
      buyer_address: order.buyer?.address,
      buyer_detail_address: order.buyer?.detail_address,
      buyer_customs_code: order.buyer?.customs_code,

      // PURCHASE
      product_name: productName,
      product_name_en: null, // TODO: 영문 번역 v0.5+
      qty,
      unit_price: unitPrice,
      total_price: totalPrice,
      currency,
      product_url: productUrl,
      brand: item.brand,
      supplier_order_number: supplierOrderNumber,
      tracking_number_overseas: item.tracking_number_overseas,
      supplier_site: supplierSite,
    }
  }

  // ─── Fill 실행 (kind 별 다른 전략) ──────────────────────────────────────
  function applyFillByKind(classification, order) {
    const values = buildValueMap(order)
    const kind = classification.kind

    let fieldsToFill = []
    if (kind === 'combined') {
      fieldsToFill = [...classification.shippingFields, ...classification.purchaseFields]
    } else if (kind === 'shipping_only') {
      fieldsToFill = [...classification.shippingFields]
    } else if (kind === 'purchase_only') {
      fieldsToFill = [...classification.purchaseFields]
    }

    const result = { filled: [], missing: [], kind }
    for (const { el, semantic } of fieldsToFill) {
      const value = values[semantic]
      if (value == null || value === '') {
        result.missing.push({ semantic, name: el.name || el.id || '(unnamed)' })
        continue
      }
      const ok = fillFieldByValue(el, value)
      if (ok) result.filled.push({ semantic, name: el.name || el.id || '(unnamed)' })
      else result.missing.push({ semantic, name: el.name || el.id || '(unnamed)' })
    }
    return result
  }

  // ─── 페이지 감지 ────────────────────────────────────────────────────────
  function shouldShowButton() {
    const cls = getClassifierModule()
    if (!cls) return false
    const classification = cls.classifyForm()
    return classification.kind !== 'none'
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
      'width:380px', 'max-height:540px', 'overflow:hidden',
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

  let cachedOrders = null
  let cachedClassification = null

  async function openPanel() {
    const cls = getClassifierModule()
    cachedClassification = cls ? cls.classifyForm() : null
    const kindLabel = (cls && cachedClassification) ? cls.KIND_LABEL[cachedClassification.kind] : '알 수 없음'

    renderPanel(`
      <div style="padding:14px 16px;border-bottom:1px solid #f1f5f9">
        <div style="font-weight:700;color:#0f172a">🪄 자동 채우기</div>
        <div style="margin-top:4px;font-size:11px;color:#64748b">
          페이지 인식: <b style="color:#4f46e5">${escapeHtml(kindLabel)}</b>
          ${cachedClassification ? ` · shipping ${cachedClassification.shippingSemantics.length} · purchase ${cachedClassification.purchaseSemantics.length}` : ''}
        </div>
      </div>
      <div style="padding:24px 16px;text-align:center;color:#475569;flex:1">주문 불러오는 중…</div>
    `)

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
    cachedOrders = result.orders || []
    if (cachedOrders.length === 0) {
      renderPanel(`
        <div style="padding:14px 16px;border-bottom:1px solid #f1f5f9">
          <div style="font-weight:700;color:#0f172a">🪄 자동 채우기</div>
          <div style="margin-top:4px;font-size:11px;color:#64748b">페이지 인식: ${escapeHtml(kindLabel)}</div>
        </div>
        <div style="padding:24px 16px;color:#475569;font-size:11px;text-align:center">
          채울 주문이 없습니다.<br/>
          짐스캐너 /orders/new 에서 주문을 등록한 후 이 페이지로 돌아와 다시 시도하세요.
        </div>
        <div style="padding:10px 16px;border-top:1px solid #f1f5f9;text-align:right">
          <button id="jsx-fill-close" style="font-size:11px;color:#475569;background:white;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;cursor:pointer">닫기</button>
        </div>
      `)
      document.getElementById('jsx-fill-close')?.addEventListener('click', closePanel)
      return
    }
    renderOrderList(cachedOrders, cachedClassification, kindLabel)
  }

  function renderOrderList(orders, classification, kindLabel) {
    const kind = classification && classification.kind
    const showReceiptColumn = kind === 'combined' || kind === 'purchase_only'

    const items = orders.slice(0, 30).map((o) => {
      const receiptCount = (o.matched_receipts || []).length
      const receiptBadge = receiptCount > 0
        ? `<span style="font-size:10px;color:#047857;background:#ecfdf5;border:1px solid #a7f3d0;padding:1px 5px;border-radius:3px">📦 영수증 ${receiptCount}</span>`
        : (showReceiptColumn
            ? `<span style="font-size:10px;color:#b45309;background:#fef3c7;border:1px solid #fde68a;padding:1px 5px;border-radius:3px" title="짐스캐너 /imports 에서 매칭 필요">⚠️ 영수증 미매칭</span>`
            : '')
      return `
        <li data-id="${escapeHtml(o.id)}" class="jsx-fill-order" style="border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background 120ms">
          <div style="padding:10px 14px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;flex-wrap:wrap">
              <span style="font-size:11px;font-weight:700;color:#0f172a">${escapeHtml(o.market_order_number || o.order_number || '주문')}</span>
              ${o.marketplace ? `<span style="font-size:10px;color:#4338ca;background:#eef2ff;border:1px solid #c7d2fe;padding:1px 5px;border-radius:3px">${escapeHtml(o.marketplace)}</span>` : ''}
              ${receiptBadge}
            </div>
            <div style="font-size:11px;color:#475569">${escapeHtml(o.buyer?.name || '구매자 없음')} · ${escapeHtml(o.first_product || '상품 없음')}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px">${escapeHtml(o.forwarder?.name || '배대지 미지정')}</div>
          </div>
        </li>
      `
    }).join('')

    const hint = kind === 'shipping_only'
      ? '배송지 (수령자) 정보만 채웁니다 — 매입 정보 단계는 다른 페이지일 거예요.'
      : kind === 'purchase_only'
        ? '매입 정보만 채웁니다 — 배송지 단계는 다른 페이지일 거예요. 영수증 매칭된 주문 권장.'
        : '배송지 + 매입 정보 한 번에 채웁니다 (통합형 신청서).'

    renderPanel(`
      <div style="padding:14px 16px;border-bottom:1px solid #f1f5f9">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="font-weight:700;color:#0f172a">🪄 주문 선택</div>
          <button id="jsx-fill-close" style="font-size:18px;color:#94a3b8;background:none;border:none;cursor:pointer;line-height:1">×</button>
        </div>
        <div style="margin-top:4px;font-size:11px;color:#64748b">
          페이지 인식: <b style="color:#4f46e5">${escapeHtml(kindLabel)}</b>
        </div>
        <div style="margin-top:6px;font-size:10px;color:#64748b;line-height:1.4">${escapeHtml(hint)}</div>
      </div>
      <ul style="margin:0;padding:0;list-style:none;overflow-y:auto;flex:1">${items}</ul>
      <div style="padding:8px 16px;border-top:1px solid #f1f5f9;font-size:10px;color:#94a3b8;background:#f8fafc;text-align:center">
        <a href="https://jimscanner-seller.vercel.app/orders" target="_blank" style="color:#4f46e5">주문 목록</a> ·
        <a href="https://jimscanner-seller.vercel.app/imports" target="_blank" style="color:#4f46e5">영수증 매칭</a>
      </div>
    `)
    document.getElementById('jsx-fill-close')?.addEventListener('click', closePanel)
    document.querySelectorAll('.jsx-fill-order').forEach((li) => {
      li.addEventListener('mouseenter', () => (li.style.background = '#f8fafc'))
      li.addEventListener('mouseleave', () => (li.style.background = ''))
      li.addEventListener('click', () => {
        const id = li.getAttribute('data-id')
        const picked = orders.find((o) => o.id === id)
        if (picked) handleFill(picked)
      })
    })
  }

  function handleFill(order) {
    // 매번 새로 classifyForm 호출 — 페이지가 동적으로 바뀌었을 수 있음
    const cls = getClassifierModule()
    const classification = cls.classifyForm()
    const result = applyFillByKind(classification, order)
    const kindLabel = cls.KIND_LABEL[classification.kind]

    const filledHtml = result.filled.map((f) => `<li>${escapeHtml(f.semantic)} → ${escapeHtml(f.name)}</li>`).join('')
    const missingHtml = result.missing.map((m) => `<li style="color:#b45309">${escapeHtml(m.semantic)} (매칭 안 됨 — 직접 입력)</li>`).join('')

    renderPanel(`
      <div style="padding:14px 16px;background:#ecfdf5;border-bottom:1px solid #a7f3d0;color:#047857">
        <b>✓ ${result.filled.length}개 필드 채움</b>
        <div style="margin-top:4px;font-size:11px">${escapeHtml(kindLabel)}</div>
      </div>
      <div style="padding:14px 16px;color:#475569;flex:1;overflow-y:auto;font-size:11px">
        <details style="margin-bottom:8px"${result.filled.length > 0 ? '' : ' open'}>
          <summary style="cursor:pointer;color:#4f46e5">채워진 필드 ${result.filled.length}개</summary>
          <ul style="margin:6px 0 0 18px;padding:0;font-size:10px;color:#475569">${filledHtml || '<li style="color:#94a3b8">없음</li>'}</ul>
        </details>
        ${result.missing.length > 0 ? `
          <details>
            <summary style="cursor:pointer;color:#b45309">못 채운 필드 ${result.missing.length}개</summary>
            <ul style="margin:6px 0 0 18px;padding:0;font-size:10px">${missingHtml}</ul>
          </details>
        ` : ''}
        <p style="margin:8px 0 0 0;color:#64748b;line-height:1.5">
          매칭이 부정확하면 짐스캐너 <a href="https://jimscanner-seller.vercel.app/settings/forwarder-forms" target="_blank" style="color:#4f46e5">/settings/forwarder-forms</a> 에 [📋] 캡쳐 부탁드립니다.
        </p>
      </div>
      <div style="padding:10px 16px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;gap:6px">
        <button id="jsx-fill-back" style="font-size:11px;color:#475569;background:white;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;cursor:pointer">다른 주문</button>
        <button id="jsx-fill-close" style="font-size:11px;color:white;background:#059669;border:none;border-radius:6px;padding:6px 14px;cursor:pointer">완료</button>
      </div>
    `)
    document.getElementById('jsx-fill-close')?.addEventListener('click', closePanel)
    document.getElementById('jsx-fill-back')?.addEventListener('click', openPanel)
    console.log('[Jimscanner] 자동 채우기:', { classification, order, result })
  }

  // ─── 버튼 ───────────────────────────────────────────────────────────────
  function createButton() {
    if (document.getElementById(BTN_ID)) return
    const cls = getClassifierModule()
    const classification = cls ? cls.classifyForm() : null
    const kind = classification ? classification.kind : 'none'
    const labelByKind = {
      combined: '🪄 자동 채우기 (배송+매입)',
      shipping_only: '🪄 배송지 자동 채우기',
      purchase_only: '🪄 매입정보 자동 채우기',
      none: '🪄 자동 채우기',
    }
    const btn = document.createElement('button')
    btn.id = BTN_ID
    btn.type = 'button'
    btn.textContent = labelByKind[kind] || labelByKind.none
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
