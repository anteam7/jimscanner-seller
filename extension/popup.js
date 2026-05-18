// Chrome extension popup — 토큰/API URL 저장 + 연결 확인.

const DEFAULT_API_URL = 'https://seller.jimscanner.co.kr'

async function loadSettings() {
  const { apiUrl, token } = await chrome.storage.local.get(['apiUrl', 'token'])
  document.getElementById('api-url').value = apiUrl || DEFAULT_API_URL
  document.getElementById('token').value = token || ''
}

function setStatus(kind, message) {
  const el = document.getElementById('status')
  if (!message) {
    el.textContent = ''
    el.className = ''
    return
  }
  el.textContent = message
  el.className = kind === 'ok' ? 'status-ok' : 'status-err'
}

async function save() {
  const apiUrl = (document.getElementById('api-url').value || '').trim().replace(/\/$/, '')
  const token = (document.getElementById('token').value || '').trim()
  if (!apiUrl) return setStatus('err', 'API URL 을 입력하세요.')
  if (!token.startsWith('jsx_')) return setStatus('err', '토큰은 jsx_ 로 시작해야 합니다.')
  await chrome.storage.local.set({ apiUrl, token })
  setStatus('ok', '저장되었습니다.')
}

async function test() {
  const { apiUrl, token } = await chrome.storage.local.get(['apiUrl', 'token'])
  if (!apiUrl || !token) return setStatus('err', '먼저 저장하세요.')
  setStatus('ok', '확인 중…')
  try {
    // 비어 있는 POST 로 인증만 검증 (400 반환이 정상 — 토큰은 OK).
    const res = await fetch(apiUrl + '/api/imports/supplier-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({}),
    })
    if (res.status === 401) {
      setStatus('err', '토큰이 거부됐습니다 (401).')
      return
    }
    setStatus('ok', `연결 OK (status ${res.status})`)
  } catch (err) {
    setStatus('err', '네트워크 오류: ' + (err && err.message ? err.message : err))
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings()
  document.getElementById('save').addEventListener('click', save)
  document.getElementById('test').addEventListener('click', test)
  document.getElementById('open-settings').addEventListener('click', async (e) => {
    e.preventDefault()
    const { apiUrl } = await chrome.storage.local.get(['apiUrl'])
    chrome.tabs.create({ url: (apiUrl || DEFAULT_API_URL) + '/settings/extension' })
  })
  document.getElementById('open-imports').addEventListener('click', async (e) => {
    e.preventDefault()
    const { apiUrl } = await chrome.storage.local.get(['apiUrl'])
    chrome.tabs.create({ url: (apiUrl || DEFAULT_API_URL) + '/imports' })
  })
})
