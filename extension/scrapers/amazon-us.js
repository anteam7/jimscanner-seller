// Amazon US order detail / order history 페이지 스크래퍼.
// 가장 안정적인 시점은 "Order details" 페이지 (URL 에 orderID 파라미터 포함).
// 페이지 우측 하단에 floating 버튼을 삽입.

;(function () {
  if (window.__JIMSCANNER_INJECTED__) return
  window.__JIMSCANNER_INJECTED__ = true

  const BUTTON_ID = 'jimscanner-import-btn'
  const PANEL_ID = 'jimscanner-import-panel'

  function getOrderIdFromUrl() {
    try {
      const u = new URL(window.location.href)
      return u.searchParams.get('orderID') || u.searchParams.get('orderId') || null
    } catch {
      return null
    }
  }

  function text(el) {
    return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''
  }

  function parseUSDLike(s) {
    if (!s) return null
    const m = String(s).replace(/[, ]/g, '').match(/(-?\$?\d+(?:\.\d+)?)/)
    if (!m) return null
    const n = parseFloat(m[1].replace('$', ''))
    return Number.isFinite(n) ? n : null
  }

  // Order details 페이지의 라인 아이템 추출.
  // 셀렉터는 Amazon 가 자주 변경하므로 여러 후보를 차례로 시도.
  function scrapeOrderDetails() {
    const orderId = getOrderIdFromUrl()
    if (!orderId) return null

    // 주문일 — "Order placed: January 15, 2026" 형식
    const dateLabel = Array.from(document.querySelectorAll('.order-date-invoice-item, .a-row .a-color-secondary'))
      .map(text)
      .find((t) => /Order placed/i.test(t) || /注文日/.test(t))
    let purchasedAt = null
    if (dateLabel) {
      const cleaned = dateLabel.replace(/^.*Order placed[: ]*/i, '').trim()
      const d = Date.parse(cleaned)
      if (!Number.isNaN(d)) purchasedAt = new Date(d).toISOString()
    }

    // 상품 라인 — Amazon 의 detail 페이지는 .a-fixed-left-grid 안에 product 정보 포함
    const itemRows = Array.from(document.querySelectorAll('.a-fixed-left-grid, [data-component="item-row"]'))
    const items = []
    for (const row of itemRows) {
      const nameEl = row.querySelector('.a-link-normal[href*="/gp/product"], .a-link-normal[href*="/dp/"]')
      const name = text(nameEl)
      if (!name) continue
      const href = nameEl.getAttribute('href') || ''
      let productUrl = null
      try {
        productUrl = new URL(href, 'https://www.amazon.com').toString()
      } catch {
        productUrl = null
      }
      // ASIN 추출 (/dp/XXXXXXXXXX or /gp/product/XXXXXXXXXX)
      const asinMatch = href.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/)
      const asin = asinMatch ? asinMatch[1] : null
      // 가격
      const priceEl = row.querySelector('.a-color-price')
      const unitPrice = parseUSDLike(text(priceEl))
      // 수량 — "Qty: 2" 같은 텍스트
      const qtyText = (row.textContent || '').match(/Qty\s*[:：]?\s*(\d+)/i)
      const qty = qtyText ? Number(qtyText[1]) || 1 : 1
      // 이미지
      const imgEl = row.querySelector('img')
      const imageUrl = imgEl ? imgEl.getAttribute('src') : null

      items.push({ name, qty, unit_price: unitPrice, asin, image_url: imageUrl, product_url: productUrl })
    }

    // Order total — #od-subtotals 의 마지막 row "Grand Total"
    const subtotalsBox = document.querySelector('#od-subtotals')
    let totalForeign = null
    let subtotalForeign = null
    let shippingForeign = null
    let taxForeign = null
    if (subtotalsBox) {
      const rows = subtotalsBox.querySelectorAll('.a-row')
      for (const r of rows) {
        const t = text(r)
        const price = parseUSDLike(t)
        if (/grand total|order total/i.test(t)) totalForeign = price
        else if (/item.*subtotal|subtotal/i.test(t) && subtotalForeign == null) subtotalForeign = price
        else if (/shipping/i.test(t) && shippingForeign == null) shippingForeign = price
        else if (/tax/i.test(t) && taxForeign == null) taxForeign = price
      }
    }

    return {
      source: 'amazon_us',
      supplier_order_number: orderId,
      purchased_at: purchasedAt,
      currency: 'USD',
      subtotal_foreign: subtotalForeign,
      shipping_foreign: shippingForeign,
      tax_foreign: taxForeign,
      total_foreign: totalForeign,
      items,
      source_url: window.location.href.split('#')[0],
      raw_meta: { items_count: items.length, scraped_at: new Date().toISOString(), ua: 'amazon-us-v0.1.0' },
    }
  }

  function createPanel() {
    const panel = document.createElement('div')
    panel.id = PANEL_ID
    panel.style.cssText = [
      'position:fixed', 'bottom:90px', 'right:20px', 'z-index:2147483646',
      'width:300px', 'padding:12px 14px', 'border-radius:10px',
      'background:white', 'border:1px solid #e2e8f0', 'box-shadow:0 10px 30px rgba(15,23,42,0.18)',
      'font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif', 'color:#0f172a',
      'font-size:12px', 'line-height:1.5', 'display:none',
    ].join(';')
    document.body.appendChild(panel)
    return panel
  }

  function showPanel(html, kind) {
    let panel = document.getElementById(PANEL_ID)
    if (!panel) panel = createPanel()
    const color = kind === 'ok' ? '#047857' : kind === 'err' ? '#b91c1c' : '#475569'
    panel.style.borderColor = kind === 'ok' ? '#a7f3d0' : kind === 'err' ? '#fecdd3' : '#e2e8f0'
    panel.style.color = color
    panel.innerHTML = html
    panel.style.display = 'block'
  }

  function createButton() {
    const btn = document.createElement('button')
    btn.id = BUTTON_ID
    btn.type = 'button'
    btn.textContent = '📦 짐스캐너로 가져오기'
    btn.style.cssText = [
      'position:fixed', 'bottom:20px', 'right:20px', 'z-index:2147483647',
      'padding:10px 16px', 'border:none', 'border-radius:999px',
      'background:#4f46e5', 'color:white', 'font-weight:600', 'font-size:12px',
      'letter-spacing:-0.005em', 'cursor:pointer',
      'box-shadow:0 6px 20px rgba(79,70,229,0.35)',
      'font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      'transition:transform 120ms,background 120ms',
    ].join(';')
    btn.addEventListener('mouseenter', () => { btn.style.background = '#4338ca' })
    btn.addEventListener('mouseleave', () => { btn.style.background = '#4f46e5' })
    btn.addEventListener('click', onImportClick)
    document.body.appendChild(btn)
  }

  async function onImportClick() {
    const btn = document.getElementById(BUTTON_ID)
    if (btn) btn.disabled = true

    const payload = scrapeOrderDetails()
    if (!payload) {
      showPanel(
        '<b>주문 ID 를 찾을 수 없습니다.</b><br/>' +
        'Amazon 의 <i>Order details</i> 페이지에서 다시 시도해 주세요. URL 에 <code>orderID=</code> 가 포함된 페이지여야 합니다.',
        'err',
      )
      if (btn) btn.disabled = false
      return
    }
    if (payload.items.length === 0) {
      showPanel(
        '<b>상품 라인을 인식하지 못했습니다.</b><br/>' +
        '페이지가 완전히 로드된 뒤 다시 눌러 보세요. 계속 문제가 있으면 짐스캐너 운영팀에 알려 주세요.',
        'err',
      )
      if (btn) btn.disabled = false
      return
    }

    showPanel(`전송 중… (상품 ${payload.items.length}건, 주문번호 ${payload.supplier_order_number})`, 'info')

    try {
      const response = await chrome.runtime.sendMessage({ type: 'JIMSCANNER_IMPORT', payload })
      if (!response || response.ok === false) {
        const errMsg = (response && response.error) || '알 수 없는 오류'
        showPanel(`<b>전송 실패</b><br/>${errMsg}`, 'err')
      } else if (response.status === 'existing') {
        showPanel(
          `<b>이미 수집된 주문입니다.</b><br/>` +
          `<a href="${response.imports_url || '/imports'}" target="_blank">짐스캐너에서 보기 →</a>`,
          'ok',
        )
      } else {
        showPanel(
          `<b>✓ 짐스캐너로 전송되었습니다.</b><br/>` +
          `주문번호: ${payload.supplier_order_number} (상품 ${payload.items.length}건)`,
          'ok',
        )
      }
    } catch (err) {
      showPanel('<b>전송 실패</b><br/>' + String(err && err.message ? err.message : err), 'err')
    } finally {
      if (btn) btn.disabled = false
    }
  }

  // Order details 페이지에서만 floating 버튼 표시.
  function init() {
    if (getOrderIdFromUrl()) {
      createButton()
    }
  }

  // SPA-like nav 대응: history 변경 후에도 한 번 재확인.
  init()
  let lastUrl = window.location.href
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href
      if (!document.getElementById(BUTTON_ID) && getOrderIdFromUrl()) {
        createButton()
      }
    }
  }, 1000)
})()
