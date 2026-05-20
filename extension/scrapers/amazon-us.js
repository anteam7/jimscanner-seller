// Amazon US order detail 페이지 스크래퍼.
// 견고성 전략: ASIN 패턴(/dp/XXXXXXXXXX) 을 가진 anchor 를 기준으로 라인 추출.
// .a-fixed-left-grid 같은 클래스 셀렉터는 Amazon 가 자주 변경하므로 fallback 으로만 사용.

;(function () {
  if (window.__JIMSCANNER_INJECTED__) return
  window.__JIMSCANNER_INJECTED__ = true

  const BUTTON_ID = 'jimscanner-import-btn'
  const PANEL_ID = 'jimscanner-import-panel'
  const ASIN_RE = /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/

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

  // 통화 기호와 천단위 콤마/공백/쉼표를 모두 제거하고 숫자만 추출.
  // KRW 는 정수, USD/JPY 는 소수 모두 대응.
  function parseAmount(s) {
    if (!s) return null
    const clean = String(s).replace(/[₩$¥€£]|KRW|USD|JPY|EUR|GBP/gi, '').replace(/[,\s]/g, '')
    const m = clean.match(/-?\d+(?:\.\d+)?/)
    if (!m) return null
    const n = parseFloat(m[0])
    return Number.isFinite(n) ? n : null
  }

  // 텍스트에서 통화 코드 추론. KRW > JPY > USD 순.
  // amazon.com 도 한국 결제자에게는 ₩ 또는 KRW 로 표시 (Amazon Currency Converter).
  function detectCurrencyInText(text) {
    if (!text) return null
    if (/₩|\bKRW\b/i.test(text)) return 'KRW'
    if (/¥|\bJPY\b/i.test(text)) return 'JPY'
    if (/\$|\bUSD\b/i.test(text)) return 'USD'
    return null
  }

  // 한 anchor 를 라인 컨테이너로 확장: ASIN 링크의 가장 가까운 "라인 박스" 찾기.
  // 후보 selector 를 순서대로 시도, 없으면 그냥 anchor 의 .parentElement 사용.
  function findLineContainer(anchor) {
    const selectors = [
      '[data-component="orderCard"]',
      '[data-component="line-item"]',
      '[data-component="purchasedItems"] .a-row',
      '.a-fixed-left-grid',
      '.yohtmlc-item',
      '.shipment-top-row',
      '.a-box-inner',
    ]
    for (const sel of selectors) {
      const c = anchor.closest(sel)
      if (c) return c
    }
    // fallback: 가장 가까운 div
    return anchor.closest('div') || anchor.parentElement
  }

  function uniqueByAsin(items) {
    const seen = new Map()
    for (const it of items) {
      const key = it.asin || (it.product_url || it.name)
      if (!key) continue
      if (!seen.has(key)) seen.set(key, it)
    }
    return Array.from(seen.values())
  }

  // 추천/관련 상품 영역 — 명시적으로 제외해야 할 컨테이너 selector 들.
  // 아마존이 자주 신/구 마크업을 섞기 때문에 후보를 폭넓게 둠.
  const EXCLUDE_SELECTORS = [
    '.a-carousel',
    '.a-carousel-container',
    '.a-carousel-card',
    '[data-component="recommendations"]',
    '[data-component="related-purchases"]',
    '[data-component="buy-again"]',
    '[data-component="related-products"]',
    '[id*="sims"]',
    '[id*="similarities"]',
    '[id*="p13n"]',
    '[id*="recommendations"]',
    '[id*="related"]',
    '[id*="buyAgain"]',
    '[aria-label*="ecommend"]',
    '[aria-label*="elated"]',
    '[aria-label*="uy it again"]',
    '.recommendations',
    '.RelatedProducts',
  ].join(',')

  // 실제 주문 상품이 들어있는 "shipment" / "order details" 컨테이너 selector 들.
  // 하나라도 매치되면 그 안의 ASIN 만 수집.
  const SHIPMENT_SELECTORS = [
    '#orderDetails',
    '[data-component="shipments"]',
    '[data-component="purchasedItems"]',
    '[data-component="shipment"]',
    '.shipment',
    '.a-box-group .shipment',
    '#od-shipments',
    '.yohtmlc-shipment-level-connections',
  ]

  function findShipmentRoots() {
    const found = new Set()
    for (const sel of SHIPMENT_SELECTORS) {
      document.querySelectorAll(sel).forEach((el) => found.add(el))
    }
    return Array.from(found)
  }

  function isInsideExcluded(anchor) {
    return !!anchor.closest(EXCLUDE_SELECTORS)
  }

  function scrapeItems() {
    // 1) 실제 주문 라인이 들어있는 shipment 컨테이너 안의 ASIN anchor 만 수집.
    //    찾지 못하면 전체 페이지에서 수집하되 추천 영역은 명시 제외 (fallback).
    const roots = findShipmentRoots()
    const searchRoots = roots.length > 0 ? roots : [document]

    const anchors = []
    for (const root of searchRoots) {
      const found = (root === document
        ? document.querySelectorAll('a[href*="/dp/"], a[href*="/gp/product/"], a[href*="/gp/aw/d/"]')
        : root.querySelectorAll('a[href*="/dp/"], a[href*="/gp/product/"], a[href*="/gp/aw/d/"]'))
      for (const a of found) {
        const href = a.getAttribute('href') || ''
        if (!ASIN_RE.test(href)) continue
        if (isInsideExcluded(a)) continue
        anchors.push(a)
      }
    }

    const items = []
    for (const a of anchors) {
      const href = a.getAttribute('href') || ''
      const m = href.match(ASIN_RE)
      if (!m) continue
      const asin = m[1]
      let productUrl = null
      try {
        productUrl = new URL(href, 'https://www.amazon.com').toString().split('#')[0]
      } catch {
        productUrl = null
      }

      // anchor 자체의 텍스트가 비어있을 수 있음 (썸네일 링크) — 라인 컨테이너에서 제목 anchor 찾기
      const container = findLineContainer(a)
      const titleA = container.querySelector(
        'a[href*="/dp/"], a[href*="/gp/product/"], a[href*="/gp/aw/d/"]',
      )
      const candidates = [text(a), text(titleA)].filter(Boolean)
      const name = candidates.find((s) => s.length > 3) || candidates[0] || asin

      // 가격
      const priceEl =
        container.querySelector('.a-color-price') ||
        container.querySelector('[class*="price"]') ||
        null
      const unitPrice = parseAmount(text(priceEl))

      // 수량
      const containerText = container.textContent || ''
      const qtyMatch = containerText.match(/Qty\s*[:：]?\s*(\d+)/i) || containerText.match(/Quantity[:：]?\s*(\d+)/i)
      const qty = qtyMatch ? Number(qtyMatch[1]) || 1 : 1

      // 이미지
      const imgEl = container.querySelector('img')
      const imageUrl = imgEl ? imgEl.getAttribute('src') : null

      items.push({ name, qty, unit_price: unitPrice, asin, image_url: imageUrl, product_url: productUrl })
    }

    return uniqueByAsin(items)
  }

  function scrapeOrderDetails() {
    const orderId = getOrderIdFromUrl()
    if (!orderId) return null

    // 주문일
    const dateLabel = Array.from(document.querySelectorAll('.order-date-invoice-item, .a-row .a-color-secondary'))
      .map(text)
      .find((t) => /Order placed/i.test(t) || /注文日/.test(t))
    let purchasedAt = null
    if (dateLabel) {
      const cleaned = dateLabel.replace(/^.*Order placed[: ]*/i, '').trim()
      const d = Date.parse(cleaned)
      if (!Number.isNaN(d)) purchasedAt = new Date(d).toISOString()
    }

    const shipmentRoots = findShipmentRoots()
    const items = scrapeItems()

    // 합계 + 통화 추론
    const subtotalsBox = document.querySelector('#od-subtotals, [class*="subtotal"]')
    let totalForeign = null
    let subtotalForeign = null
    let shippingForeign = null
    let taxForeign = null
    let detectedCurrency = null
    let totalRowText = ''
    if (subtotalsBox) {
      const rows = subtotalsBox.querySelectorAll('.a-row, tr, li')
      for (const r of rows) {
        const t = text(r)
        const price = parseAmount(t)
        if (price == null) continue
        if (/grand total|order total/i.test(t)) {
          totalForeign = price
          totalRowText = t
        } else if (/item.*subtotal|^subtotal/i.test(t) && subtotalForeign == null) {
          subtotalForeign = price
        } else if (/shipping/i.test(t) && shippingForeign == null) {
          shippingForeign = price
        } else if (/tax/i.test(t) && taxForeign == null) {
          taxForeign = price
        }
      }
      // Grand Total 행의 텍스트에서 통화 우선 추론, 그게 안 잡히면 박스 전체 텍스트.
      detectedCurrency =
        detectCurrencyInText(totalRowText) || detectCurrencyInText(text(subtotalsBox))
    }
    // 합계 박스가 없을 때 fallback: 페이지 전체 텍스트에서 한 번만 추론
    if (!detectedCurrency) {
      detectedCurrency = detectCurrencyInText(document.body.textContent || '') || 'USD'
    }

    // 정규화된 source_url — Amazon 이 변형된 URL 에서 장바구니로 redirect 하는 경우가 있어
    // orderID 만 가진 표준 형식으로 저장. 원본 URL 은 raw_meta 에 보존.
    const normalizedUrl =
      'https://www.amazon.com/gp/your-account/order-details?orderID=' +
      encodeURIComponent(orderId)

    return {
      source: 'amazon_us',
      supplier_order_number: orderId,
      purchased_at: purchasedAt,
      currency: detectedCurrency,
      subtotal_foreign: subtotalForeign,
      shipping_foreign: shippingForeign,
      tax_foreign: taxForeign,
      total_foreign: totalForeign,
      items,
      source_url: normalizedUrl,
      raw_meta: {
        items_count: items.length,
        shipment_roots_found: shipmentRoots.length,
        split_shipment: shipmentRoots.length > 1,
        scraped_at: new Date().toISOString(),
        ua: 'amazon-us-v0.5.1',
        original_url: window.location.href.split('#')[0],
        detected_currency: detectedCurrency,
        total_row_text: totalRowText || null,
      },
    }
  }

  function buildDebugReport() {
    const allAnchors = document.querySelectorAll('a[href*="/dp/"], a[href*="/gp/product/"]')
    const matched = Array.from(allAnchors).filter((a) =>
      ASIN_RE.test(a.getAttribute('href') || ''),
    )
    return {
      url: window.location.href,
      anchors_dp_or_gp_product: allAnchors.length,
      anchors_matching_asin_pattern: matched.length,
      sample_hrefs: Array.from(allAnchors).slice(0, 5).map((a) => a.getAttribute('href')),
      first_5_h2: Array.from(document.querySelectorAll('h2')).slice(0, 5).map((h) => text(h)),
      page_title: document.title,
    }
  }

  function createPanel() {
    const panel = document.createElement('div')
    panel.id = PANEL_ID
    panel.style.cssText = [
      'position:fixed', 'bottom:90px', 'right:20px', 'z-index:2147483646',
      'width:320px', 'padding:12px 14px', 'border-radius:10px',
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
      const dbg = buildDebugReport()
      console.warn('[Jimscanner] 상품 라인 인식 실패. 디버그 정보:', dbg)
      const dbgStr = JSON.stringify({ payload, dbg }, null, 2)
      showPanel(
        '<b>상품 라인을 인식하지 못했습니다.</b><br/>' +
        'Amazon 페이지 구조가 예상과 다릅니다. 아래 디버그 정보를 운영팀에 전달해 주세요.<br/>' +
        '<button id="jsx-copy-dbg" style="margin-top:6px;padding:4px 10px;font-size:11px;border:1px solid #cbd5e1;background:white;border-radius:4px;cursor:pointer;color:#334155">디버그 복사</button> ' +
        '<span style="font-size:11px;color:#94a3b8">또는 F12 → Console 탭 확인</span>',
        'err',
      )
      const copyBtn = document.getElementById('jsx-copy-dbg')
      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(dbgStr)
            copyBtn.textContent = '복사됨'
          } catch {
            copyBtn.textContent = '실패 — 콘솔 보세요'
          }
        })
      }
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

  function init() {
    if (getOrderIdFromUrl()) {
      createButton()
    }
  }

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
