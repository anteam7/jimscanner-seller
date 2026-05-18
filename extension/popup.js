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
  el.className = kind === 'ok' ? 'status-ok' : kind === 'info' ? 'status-info' : 'status-err'
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
  setStatus('info', '확인 중…')
  // background 를 통해 fetch — host_permissions 가 적용된 service worker 에서 호출.
  try {
    const result = await chrome.runtime.sendMessage({ type: 'JIMSCANNER_PING' })
    if (!result) {
      setStatus('err', 'background 응답 없음 — 확장을 다시 로드해 보세요.')
      return
    }
    if (result.ok === false) {
      setStatus('err', '오류: ' + (result.error || '알 수 없음') + (result.status ? ` (HTTP ${result.status})` : ''))
      return
    }
    // ok === true: 인증 통과 (HTTP 400 — body 비어서) — 또는 다른 정상 응답
    setStatus('ok', `연결 OK (HTTP ${result.status})`)
  } catch (err) {
    setStatus('err', '메시지 전송 실패: ' + (err && err.message ? err.message : err))
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
