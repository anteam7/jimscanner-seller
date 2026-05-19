// Amazon US/JP checkout/.../address 페이지의 배송지 form 에
// 짐스캐너 배대지 주소를 자동 채우는 content script.
// React-controlled input 대응: native setter + dispatchEvent.

;(function () {
  if (window.__JIMSCANNER_FILLER_INJECTED__) return
  window.__JIMSCANNER_FILLER_INJECTED__ = true

  const BUTTON_ID = 'jimscanner-fill-btn'
  const PANEL_ID = 'jimscanner-fill-panel'

  // origin 으로 country 결정
  function detectCountry() {
    const host = location.hostname
    if (/amazon\.co\.jp$/i.test(host)) return 'JP'
    if (/amazon\.com$/i.test(host)) return 'US'
    return 'US'
  }

  // React-controlled input/select 에 값 설정 + 이벤트 발생
  function setReactValue(el, value) {
    if (!el) return false
    const tag = el.tagName
    const proto =
      tag === 'SELECT'
        ? window.HTMLSelectElement.prototype
        : tag === 'TEXTAREA'
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype
    const desc = Object.getOwnPropertyDescriptor(proto, 'value')
    if (desc && desc.set) {
      desc.set.call(el, value == null ? '' : String(value))
    } else {
      el.value = value == null ? '' : String(value)
    }
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }

  // 후보 selector 중 처음 만나는 요소 반환
  function pick(...selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel)
      if (el) return el
    }
    return null
  }

  // 한국 010-XXXX-XXXX 같은 phone 을 amazon US/JP checkout 에 맞게 정규화.
  // 미국 form: +82-10-1234-5678 또는 0101234-5678 그대로
  // 일본 form: 일본 amazon 은 한국 phone 도 받음 (국제 형식)
  function normalizeSellerPhone(raw, country) {
    if (!raw) return null
    const cleaned = String(raw).trim().replace(/\s+/g, '')
    if (!cleaned) return null
    // 이미 국가코드 있으면 그대로
    if (cleaned.startsWith('+')) return cleaned
    // 한국 010, 02, 070 등으로 시작하면 +82 붙임 (carrier 가 국제호출 가능)
    if (/^0\d/.test(cleaned)) {
      const stripped = cleaned.replace(/^0/, '').replace(/-/g, '')
      return country === 'US' || country === 'JP' ? '+82' + stripped : cleaned
    }
    return cleaned
  }

  // amazon checkout 의 form 필드를 찾고 채움
  function fillAddress(addr, sellerPhone) {
    const fields = {
      fullName: pick(
        '[name="enterAddressFullName"]',
        '[autocomplete="name"]',
        '[autocomplete="cc-name"]',
        'input[id*="FullName"]',
      ),
      phone: pick(
        '[name="enterAddressPhoneNumber"]',
        '[autocomplete="tel"]',
        '[autocomplete="tel-national"]',
        'input[id*="PhoneNumber"]',
      ),
      address1: pick(
        '[name="enterAddressAddressLine1"]',
        '[autocomplete="address-line1"]',
        'input[id*="AddressLine1"]',
      ),
      address2: pick(
        '[name="enterAddressAddressLine2"]',
        '[autocomplete="address-line2"]',
        'input[id*="AddressLine2"]',
      ),
      city: pick(
        '[name="enterAddressCity"]',
        '[autocomplete="address-level2"]',
        'input[id*="City"]',
      ),
      state: pick(
        '[name="enterAddressStateOrRegion"]',
        '[autocomplete="address-level1"]',
        'select[id*="State"]',
        'input[id*="State"]',
      ),
      zip: pick(
        '[name="enterAddressPostalCode"]',
        '[autocomplete="postal-code"]',
        'input[id*="PostalCode"]',
        'input[id*="Zip"]',
      ),
      country: pick(
        '[name="enterAddressCountryCode"]',
        '[autocomplete="country"]',
        '[autocomplete="country-name"]',
        'select[id*="Country"]',
      ),
    }

    const filled = {}
    const missing = []

    // address2 가 비어있고 회원번호가 있으면 회원번호를 address2 에 넣어줌
    const addr2 = addr.address2 || (addr.member_no ? `Member # ${addr.member_no}` : null)

    // phone: 공용 주소 phone NULL 이면 셀러 본인 phone 으로 fallback
    let phoneToFill = addr.phone
    let phoneFallbackUsed = false
    if (!phoneToFill && sellerPhone) {
      phoneToFill = normalizeSellerPhone(sellerPhone, addr.country)
      phoneFallbackUsed = true
    }

    const map = {
      fullName: addr.recipient_name,
      phone: phoneToFill,
      address1: addr.address1,
      address2: addr2,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      country: addr.country,
    }

    for (const [key, value] of Object.entries(map)) {
      if (value == null || value === '') {
        filled[key] = 'skipped'
        continue
      }
      const el = fields[key]
      if (!el) {
        missing.push(key)
        filled[key] = 'no-input'
        continue
      }
      if (el.tagName === 'SELECT') {
        // option value 일치 찾기 (US 의 'CA' 같은 약자)
        const target = String(value).trim().toUpperCase()
        let matched = false
        for (const opt of el.options) {
          const v = (opt.value || '').toUpperCase()
          const t = (opt.textContent || '').toUpperCase()
          if (v === target || t === target || t.startsWith(target)) {
            setReactValue(el, opt.value)
            matched = true
            break
          }
        }
        filled[key] = matched ? 'ok' : 'no-option'
        if (!matched) missing.push(key)
      } else {
        setReactValue(el, value)
        filled[key] = 'ok'
      }
    }

    return { filled, missing, phoneFallbackUsed }
  }

  // ─── UI ────────────────────────────────────────────────────────────────
  function createButton() {
    if (document.getElementById(BUTTON_ID)) return
    const btn = document.createElement('button')
    btn.id = BUTTON_ID
    btn.type = 'button'
    btn.textContent = '🏠 배대지 주소 채우기'
    btn.style.cssText = [
      'position:fixed', 'bottom:20px', 'right:20px', 'z-index:2147483647',
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

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID)
    if (panel) return panel
    panel = document.createElement('div')
    panel.id = PANEL_ID
    panel.style.cssText = [
      'position:fixed', 'bottom:80px', 'right:20px', 'z-index:2147483646',
      'width:380px', 'max-height:520px', 'overflow:hidden',
      'border-radius:12px', 'background:white',
      'border:1px solid #e2e8f0', 'box-shadow:0 20px 40px rgba(15,23,42,0.2)',
      'font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      'color:#0f172a', 'font-size:12px', 'line-height:1.5',
      'display:flex', 'flex-direction:column',
    ].join(';')
    document.body.appendChild(panel)
    return panel
  }

  function closePanel() {
    const panel = document.getElementById(PANEL_ID)
    if (panel) panel.remove()
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
    )
  }

  function renderPanel(content) {
    const panel = ensurePanel()
    panel.innerHTML = content
  }

  function renderError(msg, extra) {
    renderPanel(`
      <div style="padding:14px 16px;background:#fff1f2;border-bottom:1px solid #fecdd3;color:#b91c1c;font-weight:600">
        ${escapeHtml(msg)}
      </div>
      <div style="padding:14px 16px;color:#475569;flex:1">${extra ? escapeHtml(extra) : ''}</div>
      <div style="padding:10px 16px;border-top:1px solid #f1f5f9;text-align:right">
        <button id="jsx-fill-close" style="font-size:11px;color:#475569;background:white;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;cursor:pointer">닫기</button>
      </div>
    `)
    document.getElementById('jsx-fill-close')?.addEventListener('click', closePanel)
  }

  async function openPanel() {
    const country = detectCountry()
    renderPanel(`
      <div style="padding:14px 16px;border-bottom:1px solid #f1f5f9">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="font-weight:700;color:#0f172a">배대지 주소 선택</div>
          <button id="jsx-fill-close" style="font-size:18px;color:#94a3b8;background:none;border:none;cursor:pointer;line-height:1">×</button>
        </div>
        <div style="margin-top:4px;font-size:11px;color:#64748b">
          ${country === 'JP' ? '🇯🇵 일본 배대지' : '🇺🇸 미국 배대지'} (${escapeHtml(location.hostname)})
        </div>
      </div>
      <div style="padding:24px 16px;text-align:center;color:#475569;flex:1">불러오는 중…</div>
    `)
    document.getElementById('jsx-fill-close')?.addEventListener('click', closePanel)

    let result
    try {
      result = await chrome.runtime.sendMessage({ type: 'JIMSCANNER_FETCH_ADDRESSES', country })
    } catch (err) {
      renderError('주소 조회 실패', String(err && err.message ? err.message : err))
      return
    }
    if (!result || result.ok === false) {
      renderError('주소 조회 실패', (result && result.error) || '확장 popup 에서 토큰 저장을 확인하세요.')
      return
    }
    const addresses = result.addresses || []
    sellerInfo = result.seller || null
    if (addresses.length === 0) {
      renderError(
        `${country} 배대지 주소가 등록되어 있지 않습니다.`,
        '짐스캐너 /settings/forwarder-addresses 에서 주소를 등록한 후 다시 시도하세요.',
      )
      return
    }
    renderList(addresses, country)
  }

  function renderAddressItem(a) {
    return `
      <li data-id="${escapeHtml(a.id)}" style="border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background 120ms" class="jsx-addr-item">
        <div style="padding:10px 14px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;flex-wrap:wrap">
            <span style="font-weight:700;color:#0f172a">${escapeHtml(a.label)}</span>
            ${a.forwarders?.name ? `<span style="font-size:10px;color:#4338ca;background:#eef2ff;border:1px solid #c7d2fe;padding:1px 5px;border-radius:3px">${escapeHtml(a.forwarders.name)}</span>` : ''}
            ${a.is_default ? `<span style="font-size:10px;color:#047857;background:#ecfdf5;border:1px solid #a7f3d0;padding:1px 5px;border-radius:3px">기본</span>` : ''}
          </div>
          <div style="font-size:11px;color:#475569">${escapeHtml(a.recipient_name)}</div>
          <div style="font-size:10px;color:#94a3b8;margin-top:2px">
            ${escapeHtml([a.address1, a.address2].filter(Boolean).join(', '))}, ${escapeHtml(a.city)}, ${escapeHtml(a.state)} ${escapeHtml(a.zip)} ${escapeHtml(a.country)}
          </div>
        </div>
      </li>`
  }

  function renderEmptyTab(tab, country) {
    if (tab === 'mine') {
      return `
        <div style="padding:24px 16px;text-align:center;flex:1">
          <div style="font-size:13px;color:#475569;font-weight:600;margin-bottom:6px">
            등록된 내 주소가 없습니다.
          </div>
          <div style="font-size:11px;color:#94a3b8;line-height:1.6">
            아래 [공용 주소] 탭에서 본인이 쓰는 배대지를 골라<br/>
            [내 주소로 추가] 하거나, 짐스캐너 설정에서 직접 등록하세요.
          </div>
        </div>`
    }
    return `
      <div style="padding:24px 16px;text-align:center;flex:1">
        <div style="font-size:13px;color:#475569;font-weight:600;margin-bottom:6px">
          ${country === 'JP' ? '🇯🇵 일본' : '🇺🇸 미국'} 공용 주소가 없습니다.
        </div>
      </div>`
  }

  // 활성 탭은 currentTab 클로저 변수로 관리
  let currentTab = 'mine'
  let allAddresses = []
  let currentCountry = 'US'
  let sellerInfo = null // { phone, business_name }

  function renderList(addresses, country) {
    allAddresses = addresses
    currentCountry = country
    const mine = addresses.filter((a) => a.account_id != null)
    const official = addresses.filter((a) => a.is_official === true)
    // 첫 진입: 내 주소가 있으면 mine, 없으면 official
    currentTab = mine.length > 0 ? 'mine' : 'official'
    drawTabs(mine, official, country)
  }

  function drawTabs(mine, official, country) {
    const activeList = currentTab === 'mine' ? mine : official
    const itemsHtml =
      activeList.length === 0
        ? renderEmptyTab(currentTab, country)
        : `<ul id="jsx-fill-list" style="margin:0;padding:0;list-style:none">${activeList.map(renderAddressItem).join('')}</ul>`

    const tabBtn = (key, label, count) => `
      <button data-tab="${key}" class="jsx-tab-btn" style="
        flex:1;padding:8px 4px;border:none;background:transparent;
        font-size:11px;font-weight:600;cursor:pointer;
        color:${currentTab === key ? '#4f46e5' : '#64748b'};
        border-bottom:2px solid ${currentTab === key ? '#4f46e5' : 'transparent'};
        transition:color 120ms,border-color 120ms">
        ${label} <span style="font-weight:500;color:${currentTab === key ? '#6366f1' : '#94a3b8'}">(${count})</span>
      </button>`

    renderPanel(`
      <div style="padding:14px 16px;border-bottom:1px solid #f1f5f9">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="font-weight:700;color:#0f172a">배대지 주소 선택</div>
          <button id="jsx-fill-close" style="font-size:18px;color:#94a3b8;background:none;border:none;cursor:pointer;line-height:1">×</button>
        </div>
        <div style="margin-top:4px;font-size:11px;color:#64748b">
          ${country === 'JP' ? '🇯🇵 일본 배대지' : '🇺🇸 미국 배대지'}
        </div>
      </div>
      <div style="display:flex;border-bottom:1px solid #e2e8f0;background:#f8fafc">
        ${tabBtn('mine', '내 주소', mine.length)}
        ${tabBtn('official', '공용 주소', official.length)}
      </div>
      <div id="jsx-tab-body" style="flex:1;overflow-y:auto">${itemsHtml}</div>
      <div style="padding:8px 16px;border-top:1px solid #f1f5f9;font-size:10px;color:#94a3b8;background:#f8fafc">
        주소 추가/수정: <a href="https://jimscanner-seller.vercel.app/settings/forwarder-addresses" target="_blank" style="color:#4f46e5">/settings/forwarder-addresses</a>
      </div>
    `)
    document.getElementById('jsx-fill-close')?.addEventListener('click', closePanel)
    document.querySelectorAll('.jsx-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab')
        if (tab && tab !== currentTab) {
          currentTab = tab
          drawTabs(mine, official, country)
        }
      })
    })
    document.querySelectorAll('.jsx-addr-item').forEach((li) => {
      li.addEventListener('mouseenter', () => (li.style.background = '#f8fafc'))
      li.addEventListener('mouseleave', () => (li.style.background = ''))
      li.addEventListener('click', () => {
        const id = li.getAttribute('data-id')
        const picked = allAddresses.find((a) => a.id === id)
        if (picked) applyFill(picked)
      })
    })
  }

  function applyFill(addr) {
    const sellerPhone = sellerInfo && sellerInfo.phone ? sellerInfo.phone : null
    const result = fillAddress(addr, sellerPhone)
    const okCount = Object.values(result.filled).filter((v) => v === 'ok').length
    const missingMsg = result.missing.length
      ? `<div style="margin-top:6px;font-size:11px;color:#b91c1c">못 채운 필드: ${result.missing.join(', ')}</div>`
      : ''
    const fallbackMsg = result.phoneFallbackUsed
      ? `<div style="margin-top:4px;font-size:11px;color:#0369a1;background:#f0f9ff;border:1px solid #bae6fd;border-radius:4px;padding:4px 8px">📞 phone 은 셀러 본인 번호로 자동 채움 (공용 주소에 phone 없어서)</div>`
      : ''
    renderPanel(`
      <div style="padding:14px 16px;background:#ecfdf5;border-bottom:1px solid #a7f3d0;color:#047857">
        <b>✓ ${escapeHtml(addr.label)} 적용</b>
        <div style="margin-top:4px;font-size:11px">${okCount}개 필드 채움</div>
        ${fallbackMsg}
        ${missingMsg}
      </div>
      <div style="padding:14px 16px;color:#475569;flex:1;font-size:11px">
        값이 잘 들어갔는지 form 을 확인하세요. State select 가 비어있으면 manual 로 선택해 주세요.
      </div>
      <div style="padding:10px 16px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;gap:6px">
        <button id="jsx-back" style="font-size:11px;color:#475569;background:white;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;cursor:pointer">다른 주소</button>
        <button id="jsx-fill-close" style="font-size:11px;color:white;background:#059669;border:none;border-radius:6px;padding:6px 14px;cursor:pointer">완료</button>
      </div>
    `)
    document.getElementById('jsx-fill-close')?.addEventListener('click', closePanel)
    document.getElementById('jsx-back')?.addEventListener('click', openPanel)
    console.log('[Jimscanner] 주소 자동입력 결과:', result)
  }

  // 페이지 로드 + SPA 라우팅 대응
  function shouldShow() {
    return /\/checkout\/.*\/address|\/gp\/buy\/addressselect/i.test(location.pathname)
  }

  function tryInject() {
    if (shouldShow()) {
      createButton()
    } else {
      const btn = document.getElementById(BUTTON_ID)
      if (btn) btn.remove()
      closePanel()
    }
  }

  tryInject()
  let lastUrl = location.href
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      tryInject()
    }
  }, 1000)
})()
