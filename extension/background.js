// MV3 service worker — content script 가 보낸 메시지를 짐스캐너 API 로 중계.
// CORS 제약을 피하려고 fetch 는 백그라운드에서 수행 (host_permissions 영향 받지 않음).

const DEFAULT_API_URL = 'https://seller.jimscanner.co.kr'

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'JIMSCANNER_IMPORT') {
    handleImport(msg.payload)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((err) => sendResponse({ ok: false, error: String(err && err.message ? err.message : err) }))
    return true
  }
  if (msg && msg.type === 'JIMSCANNER_PING') {
    handlePing()
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ ok: false, error: String(err && err.message ? err.message : err) }))
    return true
  }
  if (msg && msg.type === 'JIMSCANNER_FETCH_ADDRESSES') {
    handleFetchAddresses(msg.country)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((err) => sendResponse({ ok: false, error: String(err && err.message ? err.message : err) }))
    return true
  }
  return false
})

async function handleFetchAddresses(country) {
  const { apiUrl, token } = await chrome.storage.local.get(['apiUrl', 'token'])
  if (!token) throw new Error('토큰이 설정되지 않았습니다.')
  const base = (apiUrl || DEFAULT_API_URL).replace(/\/$/, '')
  const qs = country ? `?country=${encodeURIComponent(country)}` : ''
  const url = base + '/api/extension/addresses' + qs
  let res
  try {
    res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } })
  } catch (err) {
    throw new Error('fetch 실패 [' + url + ']: ' + (err && err.message ? err.message : err))
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
  return body
}

async function handlePing() {
  const { apiUrl, token } = await chrome.storage.local.get(['apiUrl', 'token'])
  if (!token) return { ok: false, error: '토큰이 설정되지 않았습니다.' }
  const base = (apiUrl || DEFAULT_API_URL).replace(/\/$/, '')
  let res
  try {
    res = await fetch(base + '/api/imports/supplier-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({}),
    })
  } catch (err) {
    return {
      ok: false,
      error:
        'fetch 실패: ' +
        (err && err.message ? err.message : err) +
        ' — manifest host_permissions 또는 도메인 매핑 확인.',
    }
  }
  const bodyText = await res.text().catch(() => '')
  // 401 = 토큰 거부, 400 = 토큰은 OK 인데 body 비어서 거부됨 (정상 — 연결 OK).
  if (res.status === 401) {
    return { ok: false, status: 401, error: '토큰이 거부됐습니다.' }
  }
  return { ok: true, status: res.status, body: bodyText.slice(0, 200) }
}

async function handleImport(payload) {
  const { apiUrl, token } = await chrome.storage.local.get(['apiUrl', 'token'])
  if (!token) throw new Error('토큰이 설정되지 않았습니다. 확장 popup 에서 저장하세요.')
  const base = (apiUrl || DEFAULT_API_URL).replace(/\/$/, '')
  const url = base + '/api/imports/supplier-orders'

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    throw new Error(
      'fetch 실패 [' + url + ']: ' +
      (err && err.message ? err.message : String(err)) +
      ' — 확장 새로고침 / host_permissions / Vercel Deployment Protection 확인',
    )
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.error || `HTTP ${res.status} [${url}]`)
  }
  return body
}
