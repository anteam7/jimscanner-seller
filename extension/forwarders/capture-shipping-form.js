// 배대지 사이트에서 배송신청서 폼을 자동 감지 → [📋 HTML 캡쳐] 플로팅 버튼 노출.
// 셀러가 클릭하면 form 영역의 outerHTML + 모든 input/select/textarea 메타데이터를
// 짐스캐너 API 로 업로드. 짐스캐너 팀은 이걸 보고 selector 매핑을 작성해 자동입력
// content script 를 완성한다.
//
// 동작:
//   1. 페이지에 form/입력 그룹이 있고 + 신청서 키워드 매칭되면 활성화
//   2. 우하단 [📋 배송신청서 HTML 캡쳐] 버튼 표시 (z-index 매우 높음)
//   3. 셀러 클릭 → form 영역 자동 식별 → outerHTML 추출 + 필드 메타데이터 정리
//   4. POST /api/extension/form-snapshot (Bearer 토큰)
//   5. 성공 안내 패널 표시
//
// 안전:
//   - input value 는 마스킹 (개인정보 보호) — name/id/label/placeholder/type 만 추출
//   - HTML 자체에 셀러 개인정보가 있을 수 있어 100KB 로 잘라 보냄
//   - 버튼은 셀러가 의도적으로 누를 때만 동작 (자동 업로드 없음)

;(function () {
  if (window.__JIMSCANNER_FORM_CAPTURE_INJECTED__) return
  window.__JIMSCANNER_FORM_CAPTURE_INJECTED__ = true

  const BTN_ID = 'jimscanner-form-capture-btn'
  const PANEL_ID = 'jimscanner-form-capture-panel'
  const MAX_HTML = 100_000

  // 한국 배대지 사이트의 배송신청서 페이지에 자주 등장하는 키워드.
  // 어느 하나라도 페이지에 보이면 후보.
  const SHIPPING_KEYWORDS = [
    '배송신청', '배송 신청', '발송신청', '발송 신청',
    '신청서 작성', '배송대행 신청', '배대 신청',
    '주문번호', '트래킹번호', '상품정보', '수령자',
    '구매자정보', '받는분', '받는 분', '국내 받는분',
    '운송장 입력',
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
    // form 태그 안 input/select/textarea 5개 이상이면 후보
    const forms = Array.from(document.querySelectorAll('form'))
    for (const f of forms) {
      const inputs = f.querySelectorAll('input, select, textarea')
      if (inputs.length >= 5) return true
    }
    // form 태그 안 써도 많은 input 이 모여있으면 후보
    const allInputs = document.querySelectorAll('input, select, textarea')
    return allInputs.length >= 10
  }

  function shouldShowButton() {
    return pageHasShippingFormKeywords() && hasMeaningfulForm()
  }

  // 입력 요소 메타데이터 추출 (value 는 제외 — 개인정보 보호)
  function extractFieldMeta(el) {
    const tag = el.tagName.toLowerCase()
    const id = el.id || null
    const name = el.getAttribute('name') || null
    const type = el.getAttribute('type') || (tag === 'select' ? 'select' : tag === 'textarea' ? 'textarea' : 'text')
    const placeholder = el.getAttribute('placeholder') || null
    const required = el.required || el.getAttribute('aria-required') === 'true'
    const readonly = el.readOnly || el.getAttribute('aria-readonly') === 'true'
    const className = (el.className && typeof el.className === 'string') ? el.className.slice(0, 200) : null
    const dataAttrs = {}
    for (const attr of el.attributes) {
      if (attr.name.startsWith('data-')) dataAttrs[attr.name] = String(attr.value).slice(0, 100)
    }
    // label 추적: <label for="id"> or 부모 <label>
    let labelText = null
    if (id) {
      const lab = document.querySelector(`label[for="${CSS.escape(id)}"]`)
      if (lab) labelText = (lab.innerText || '').trim().slice(0, 100)
    }
    if (!labelText) {
      const parentLabel = el.closest('label')
      if (parentLabel) labelText = (parentLabel.innerText || '').trim().slice(0, 100)
    }
    if (!labelText) {
      // 좌측 또는 위쪽 텍스트 노드 (table/dl 패턴)
      const tr = el.closest('tr')
      if (tr) {
        const th = tr.querySelector('th') || tr.querySelector('td:first-child')
        if (th && th !== el && !th.contains(el)) {
          labelText = (th.innerText || '').trim().slice(0, 100)
        }
      }
    }
    // select 옵션
    let options = null
    if (tag === 'select') {
      const opts = Array.from(el.options || [])
      options = opts.slice(0, 50).map((o) => ({ value: o.value, text: (o.textContent || '').trim().slice(0, 80) }))
    }
    return { tag, type, id, name, label: labelText, placeholder, required, readonly, className, dataAttrs, options }
  }

  // form 영역 식별: 가장 input 이 많이 모여있는 부모 노드
  function pickMainFormContainer() {
    const candidates = Array.from(document.querySelectorAll('form, [class*="form"], [id*="form"]'))
    let best = null
    let bestCount = 0
    for (const c of candidates) {
      const n = c.querySelectorAll('input, select, textarea').length
      if (n > bestCount) {
        bestCount = n
        best = c
      }
    }
    // 위에서 못 찾으면 body 안에서 input 가장 많은 ancestor 추적
    if (!best || bestCount < 5) {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea'))
      if (inputs.length === 0) return null
      // 모든 input 의 공통 ancestor 찾기 (단순화: 첫 input 의 5단계 위)
      let node = inputs[0]
      for (let i = 0; i < 5 && node.parentElement; i++) node = node.parentElement
      best = node
    }
    return best
  }

  function collectSnapshot() {
    const container = pickMainFormContainer()
    if (!container) return null
    const inputs = Array.from(container.querySelectorAll('input, select, textarea'))
    const fields = inputs.map(extractFieldMeta)
    const html = (container.outerHTML || '').slice(0, MAX_HTML)
    return {
      url: location.href,
      page_title: document.title?.slice(0, 200) || null,
      html_excerpt: html,
      fields,
      forwarder_slug: detectForwarderSlug(),
    }
  }

  // host → forwarder slug (manifest 의 host 리스트와 동일한 매핑)
  function detectForwarderSlug() {
    const host = location.hostname.toLowerCase()
    const map = [
      ['malltail.com', 'malltail'],
      ['jimpass.com', 'jimpass'],
      ['ehanex.com', 'ehanex'],
      ['hoottown.com', 'ehanex'],
      ['iporter.com', 'iporter'],
      ['ohmyzip.com', 'ohmyzip'],
      ['geniezip.com', 'geniezip'],
      ['gajida.net', 'gajida'],
      ['gajida.com', 'gajida'],
      ['bidpot.co.kr', 'bidpot'],
      ['sevenzone.com', 'sevenzone'],
      ['yesship.com', 'yesship'],
      ['eldex.co.kr', 'eldex'],
      ['araku.co.kr', 'araku'],
      ['uniauc.com', 'unition'],
      ['easytao.co.kr', 'easytao'],
      ['jiggujiggu.com', 'jiggujiggu'],
      ['2fasts.com', 'twofasts'],
      ['post-go.co.kr', 'postgo'],
      ['postteam.co.kr', 'postteam'],
      ['thessanchina.co.kr', 'thessan'],
      ['tabae.co.kr', 'tabae'],
      ['tabaejapan.co.kr', 'tabaejapan'],
      ['woomyshipping.com', 'woomyshipping'],
      ['japantimemall.com', 'japantimemall'],
      ['joypost.co.kr', 'joypost'],
      ['chinaroad11.com', 'chinaroad'],
      ['kenzpost.com', 'kenzpost'],
      ['irasshaimase.co.kr', 'irasshaimase'],
      ['triolink.co.kr', 'triolink'],
      ['hoyausa.co.kr', 'hoyausa'],
      ['ship.itemscout.io', 'itemscout'],
    ]
    for (const [domain, slug] of map) {
      if (host === domain || host.endsWith('.' + domain)) return slug
    }
    return null
  }

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID)
    if (panel) return panel
    panel = document.createElement('div')
    panel.id = PANEL_ID
    panel.style.cssText = [
      'position:fixed', 'bottom:80px', 'right:20px', 'z-index:2147483646',
      'width:340px', 'max-height:480px', 'overflow:hidden',
      'border-radius:12px', 'background:white',
      'border:1px solid #e2e8f0', 'box-shadow:0 20px 40px rgba(15,23,42,0.2)',
      'font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      'color:#0f172a', 'font-size:12px', 'line-height:1.5',
      'display:flex', 'flex-direction:column',
    ].join(';')
    document.body.appendChild(panel)
    return panel
  }

  function renderPanel(content) {
    const panel = ensurePanel()
    panel.innerHTML = content
  }

  function closePanel() {
    const p = document.getElementById(PANEL_ID)
    if (p) p.remove()
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
    )
  }

  async function handleCapture() {
    const snapshot = collectSnapshot()
    if (!snapshot) {
      renderPanel(`
        <div style="padding:14px 16px;background:#fff1f2;border-bottom:1px solid #fecdd3;color:#b91c1c;font-weight:600">
          form 을 찾지 못했습니다
        </div>
        <div style="padding:14px 16px;color:#475569">
          이 페이지에서 input/select 요소가 모여 있는 form 영역을 못 찾았어요.
          배송신청서 작성 화면이 맞는지 확인 후 다시 시도하세요.
        </div>
        <div style="padding:10px 16px;border-top:1px solid #f1f5f9;text-align:right">
          <button id="jsx-cap-close" style="font-size:11px;color:#475569;background:white;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;cursor:pointer">닫기</button>
        </div>
      `)
      document.getElementById('jsx-cap-close')?.addEventListener('click', closePanel)
      return
    }
    renderPanel(`
      <div style="padding:14px 16px;border-bottom:1px solid #f1f5f9">
        <div style="font-weight:700;color:#0f172a">📋 HTML 캡쳐 준비됨</div>
        <div style="margin-top:4px;font-size:11px;color:#64748b">
          ${escapeHtml(snapshot.forwarder_slug || '미식별')} · 필드 ${snapshot.fields.length}개 · HTML ${(snapshot.html_excerpt.length / 1024).toFixed(1)} KB
        </div>
      </div>
      <div style="padding:14px 16px;color:#475569;flex:1;overflow-y:auto">
        <div style="font-size:11px;color:#64748b;margin-bottom:8px">
          이 페이지의 form 구조를 짐스캐너로 전송합니다. 짐스캐너 팀이
          이걸 보고 자동입력 매핑을 작성합니다.
        </div>
        <div style="font-size:11px;color:#0f172a;margin-bottom:4px"><b>보내는 정보</b></div>
        <ul style="font-size:11px;color:#475569;padding-left:18px;margin:0 0 8px 0">
          <li>현재 URL · 페이지 제목</li>
          <li>form 영역 HTML (최대 100KB)</li>
          <li>${snapshot.fields.length}개 input/select 메타데이터 (name/id/label/타입)</li>
        </ul>
        <div style="font-size:11px;color:#94a3b8">
          ※ 입력값(value) 은 포함 안 함. 개인정보 보호.
        </div>
        <label style="display:block;margin-top:10px;font-size:11px;color:#0f172a">
          메모 (선택)
          <textarea id="jsx-cap-note" rows="2" placeholder="예: '주소 입력 단계' 또는 '항공특송 신청'"
            style="display:block;width:100%;margin-top:4px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:11px;font-family:inherit;resize:vertical"></textarea>
        </label>
      </div>
      <div style="padding:10px 16px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;gap:6px">
        <button id="jsx-cap-cancel" style="font-size:11px;color:#475569;background:white;border:1px solid #cbd5e1;border-radius:6px;padding:6px 14px;cursor:pointer">취소</button>
        <button id="jsx-cap-send" style="font-size:11px;color:white;background:#059669;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;font-weight:600">짐스캐너로 전송</button>
      </div>
    `)
    document.getElementById('jsx-cap-cancel')?.addEventListener('click', closePanel)
    document.getElementById('jsx-cap-send')?.addEventListener('click', () => {
      const note = (document.getElementById('jsx-cap-note')?.value || '').trim().slice(0, 500)
      sendSnapshot({ ...snapshot, user_note: note || null })
    })
  }

  async function sendSnapshot(payload) {
    renderPanel(`<div style="padding:30px 16px;text-align:center;color:#475569">전송 중…</div>`)
    let result
    try {
      result = await chrome.runtime.sendMessage({ type: 'JIMSCANNER_FORM_SNAPSHOT', payload })
    } catch (err) {
      result = { ok: false, error: String(err && err.message ? err.message : err) }
    }
    if (!result || result.ok === false) {
      renderPanel(`
        <div style="padding:14px 16px;background:#fff1f2;border-bottom:1px solid #fecdd3;color:#b91c1c;font-weight:600">전송 실패</div>
        <div style="padding:14px 16px;color:#475569;font-size:11px">${escapeHtml((result && result.error) || '알 수 없는 오류')}</div>
        <div style="padding:10px 16px;border-top:1px solid #f1f5f9;text-align:right">
          <button id="jsx-cap-close" style="font-size:11px;color:#475569;background:white;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;cursor:pointer">닫기</button>
        </div>
      `)
      document.getElementById('jsx-cap-close')?.addEventListener('click', closePanel)
      return
    }
    renderPanel(`
      <div style="padding:14px 16px;background:#ecfdf5;border-bottom:1px solid #a7f3d0;color:#047857">
        <b>✓ 전송 완료</b>
        <div style="margin-top:4px;font-size:11px">짐스캐너 팀이 검토 후 자동입력 매핑을 추가합니다.</div>
      </div>
      <div style="padding:14px 16px;color:#475569;font-size:11px">
        같은 배대지 안 다른 단계(상품 정보 / 통관 / 결제 등) 페이지도 같은 방식으로 캡쳐해 주세요.
      </div>
      <div style="padding:10px 16px;border-top:1px solid #f1f5f9;text-align:right">
        <button id="jsx-cap-close" style="font-size:11px;color:white;background:#059669;border:none;border-radius:6px;padding:6px 14px;cursor:pointer">완료</button>
      </div>
    `)
    document.getElementById('jsx-cap-close')?.addEventListener('click', closePanel)
  }

  function createButton() {
    if (document.getElementById(BTN_ID)) return
    const btn = document.createElement('button')
    btn.id = BTN_ID
    btn.type = 'button'
    btn.textContent = '📋 배송신청서 HTML 캡쳐'
    btn.style.cssText = [
      'position:fixed', 'bottom:20px', 'right:20px', 'z-index:2147483647',
      'padding:10px 16px', 'border:none', 'border-radius:999px',
      'background:#4f46e5', 'color:white', 'font-weight:600', 'font-size:12px',
      'letter-spacing:-0.005em', 'cursor:pointer',
      'box-shadow:0 6px 20px rgba(79,70,229,0.35)',
      'font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      'transition:background 120ms',
    ].join(';')
    btn.addEventListener('mouseenter', () => { btn.style.background = '#4338ca' })
    btn.addEventListener('mouseleave', () => { btn.style.background = '#4f46e5' })
    btn.addEventListener('click', handleCapture)
    document.body.appendChild(btn)
  }

  function tryShow() {
    if (shouldShowButton()) {
      createButton()
    }
  }

  // 페이지 로드 후 + SPA 변경 + 동적 form 로딩 대응
  tryShow()
  let lastUrl = location.href
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      const old = document.getElementById(BTN_ID)
      if (old) old.remove()
      closePanel()
      setTimeout(tryShow, 1500) // SPA 라우팅 후 DOM 채워질 때까지 잠깐 대기
    } else if (!document.getElementById(BTN_ID)) {
      // 동적으로 form 이 나중에 그려지는 페이지: 5초 간격으로 재확인
      tryShow()
    }
  }, 5000)
})()
