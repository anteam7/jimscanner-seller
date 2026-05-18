// MV3 service worker — content script 가 보낸 메시지를 짐스캐너 API 로 중계.
// CORS 제약을 피하려고 fetch 는 백그라운드에서 수행 (host_permissions 영향 받지 않음).

const DEFAULT_API_URL = 'https://seller.jimscanner.co.kr'

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'JIMSCANNER_IMPORT') {
    handleImport(msg.payload)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((err) => sendResponse({ ok: false, error: String(err && err.message ? err.message : err) }))
    return true // async response
  }
  return false
})

async function handleImport(payload) {
  const { apiUrl, token } = await chrome.storage.local.get(['apiUrl', 'token'])
  if (!token) throw new Error('토큰이 설정되지 않았습니다. 확장 popup 에서 저장하세요.')
  const base = (apiUrl || DEFAULT_API_URL).replace(/\/$/, '')

  const res = await fetch(base + '/api/imports/supplier-orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return body
}
