'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AccountData = {
  email: string
  phone: string
  postal_code: string
  address: string
  detail_address: string
  business_name: string
  ceo_name: string
}

type ToastState = { type: 'success' | 'error'; message: string } | null

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [toast, onClose])

  if (!toast) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg transition-all ${
        toast.type === 'success'
          ? 'bg-green-950/90 border-green-700 text-green-200'
          : 'bg-red-950/90 border-red-700 text-red-200'
      }`}
    >
      {toast.type === 'success' ? (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      ) : (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z" />
        </svg>
      )}
      {toast.message}
    </div>
  )
}

export default function AccountSettingsPage() {
  const [account, setAccount] = useState<AccountData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  // 계정 정보 폼
  const [phone, setPhone] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [address, setAddress] = useState('')
  const [detailAddress, setDetailAddress] = useState('')
  const [infoLoading, setInfoLoading] = useState(false)
  const [infoError, setInfoError] = useState<string | null>(null)

  // 이메일 변경 폼
  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  // 비밀번호 변경 폼
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  const loadAccount = useCallback(async () => {
    const res = await fetch('/api/settings/account')
    if (!res.ok) {
      setLoadError('계정 정보를 불러오지 못했습니다.')
      return
    }
    const data: AccountData = await res.json()
    setAccount(data)
    setPhone(data.phone)
    setPostalCode(data.postal_code)
    setAddress(data.address)
    setDetailAddress(data.detail_address)
    setNewEmail(data.email)
  }, [])

  useEffect(() => { loadAccount() }, [loadAccount])

  async function handleInfoSave(e: React.FormEvent) {
    e.preventDefault()
    setInfoLoading(true)
    setInfoError(null)
    const res = await fetch('/api/settings/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, postal_code: postalCode, address, detail_address: detailAddress }),
    })
    setInfoLoading(false)
    if (!res.ok) {
      const d = await res.json()
      setInfoError(d.error ?? '저장 중 오류가 발생했습니다.')
      return
    }
    setToast({ type: 'success', message: '변경사항이 저장되었습니다.' })
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail || !newEmail.includes('@')) {
      setEmailError('올바른 이메일 주소를 입력해 주세요.')
      return
    }
    if (newEmail === account?.email) {
      setEmailError('현재 이메일과 동일합니다.')
      return
    }
    setEmailLoading(true)
    setEmailError(null)
    const res = await fetch('/api/settings/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail }),
    })
    setEmailLoading(false)
    if (!res.ok) {
      const d = await res.json()
      setEmailError(d.error ?? '이메일 변경 중 오류가 발생했습니다.')
      return
    }
    setToast({ type: 'success', message: `${newEmail}으로 확인 이메일을 발송했습니다. 확인 후 반영됩니다.` })
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPw || !newPw || !confirmPw) {
      setPwError('모든 항목을 입력해 주세요.')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('새 비밀번호가 일치하지 않습니다.')
      return
    }
    if (newPw.length < 8) {
      setPwError('새 비밀번호는 8자 이상이어야 합니다.')
      return
    }
    setPwLoading(true)
    setPwError(null)
    const res = await fetch('/api/auth/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
    })
    setPwLoading(false)
    if (!res.ok) {
      const d = await res.json()
      setPwError(d.error ?? '비밀번호 변경 중 오류가 발생했습니다.')
      return
    }
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
    setToast({ type: 'success', message: '비밀번호가 변경되었습니다.' })
  }

  if (loadError) {
    return (
      <div className="p-6 max-w-2xl">
        <p className="text-sm text-red-400">{loadError}</p>
        <button
          type="button"
          onClick={loadAccount}
          className="mt-2 text-sm text-indigo-400 hover:text-indigo-300 underline"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
          계정 정보 불러오는 중...
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white">계정 정보</h1>
        <p className="text-sm text-slate-400 mt-0.5">연락처·주소·이메일·비밀번호를 수정합니다.</p>
      </div>

      {/* 기본 정보 */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">기본 정보</h2>
        <div className="space-y-1">
          <p className="text-xs text-slate-500">상호</p>
          <p className="text-sm text-slate-300">{account.business_name || '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-slate-500">대표자</p>
          <p className="text-sm text-slate-300">{account.ceo_name || '—'}</p>
        </div>
        <form onSubmit={handleInfoSave} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="phone" className="block text-xs font-medium text-slate-400">
              연락처
            </label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20"
              aria-describedby={infoError ? 'info-error' : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="postal-code" className="block text-xs font-medium text-slate-400">
              우편번호
            </label>
            <Input
              id="postal-code"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="12345"
              maxLength={5}
              className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20 max-w-[140px]"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="address" className="block text-xs font-medium text-slate-400">
              주소
            </label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="도로명 또는 지번 주소"
              className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="detail-address" className="block text-xs font-medium text-slate-400">
              상세 주소
            </label>
            <Input
              id="detail-address"
              value={detailAddress}
              onChange={(e) => setDetailAddress(e.target.value)}
              placeholder="동·호수 등 상세 주소"
              className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20"
            />
          </div>
          {infoError && (
            <p id="info-error" role="alert" className="text-xs text-red-400">{infoError}</p>
          )}
          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={infoLoading}
              className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm h-9 px-4 disabled:opacity-50"
            >
              {infoLoading ? '저장 중...' : '변경 저장'}
            </Button>
          </div>
        </form>
      </section>

      {/* 이메일 변경 */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white">이메일 변경</h2>
          <p className="text-xs text-slate-500 mt-0.5">변경 후 새 이메일로 확인 링크가 발송됩니다.</p>
        </div>
        <form onSubmit={handleEmailChange} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-medium text-slate-400">
              새 이메일
            </label>
            <Input
              id="email"
              type="email"
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setEmailError(null) }}
              placeholder="new@example.com"
              autoComplete="email"
              className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20"
              aria-describedby={emailError ? 'email-error' : undefined}
              aria-invalid={emailError ? true : undefined}
            />
          </div>
          {emailError && (
            <p id="email-error" role="alert" className="text-xs text-red-400">{emailError}</p>
          )}
          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={emailLoading || !newEmail}
              className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm h-9 px-4 disabled:opacity-50"
            >
              {emailLoading ? '처리 중...' : '확인 이메일 발송'}
            </Button>
          </div>
        </form>
      </section>

      {/* 비밀번호 변경 */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white">비밀번호 변경</h2>
          <p className="text-xs text-slate-500 mt-0.5">현재 비밀번호를 확인한 후 변경합니다.</p>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="current-pw" className="block text-xs font-medium text-slate-400">
              현재 비밀번호
            </label>
            <div className="relative">
              <Input
                id="current-pw"
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPw}
                onChange={(e) => { setCurrentPw(e.target.value); setPwError(null) }}
                autoComplete="current-password"
                className="bg-slate-800/60 border-slate-700 text-white pr-10 focus:border-indigo-500 focus:ring-indigo-500/20"
                aria-describedby={pwError ? 'pw-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 rounded"
                aria-label={showCurrentPw ? '비밀번호 숨기기' : '비밀번호 표시'}
              >
                {showCurrentPw ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="new-pw" className="block text-xs font-medium text-slate-400">
              새 비밀번호 <span className="text-slate-600">(8자 이상)</span>
            </label>
            <div className="relative">
              <Input
                id="new-pw"
                type={showNewPw ? 'text' : 'password'}
                value={newPw}
                onChange={(e) => { setNewPw(e.target.value); setPwError(null) }}
                autoComplete="new-password"
                className="bg-slate-800/60 border-slate-700 text-white pr-10 focus:border-indigo-500 focus:ring-indigo-500/20"
                aria-invalid={pwError && newPw.length > 0 && newPw.length < 8 ? true : undefined}
              />
              <button
                type="button"
                onClick={() => setShowNewPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 rounded"
                aria-label={showNewPw ? '비밀번호 숨기기' : '비밀번호 표시'}
              >
                {showNewPw ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirm-pw" className="block text-xs font-medium text-slate-400">
              새 비밀번호 확인
            </label>
            <Input
              id="confirm-pw"
              type="password"
              value={confirmPw}
              onChange={(e) => { setConfirmPw(e.target.value); setPwError(null) }}
              autoComplete="new-password"
              className={`bg-slate-800/60 border-slate-700 text-white focus:border-indigo-500 focus:ring-indigo-500/20 ${
                confirmPw.length > 0 && newPw !== confirmPw ? 'border-red-500 focus:border-red-500' : ''
              }`}
              aria-invalid={confirmPw.length > 0 && newPw !== confirmPw ? true : undefined}
              aria-describedby={confirmPw.length > 0 && newPw !== confirmPw ? 'confirm-pw-error' : undefined}
            />
            {confirmPw.length > 0 && newPw !== confirmPw && (
              <p id="confirm-pw-error" role="alert" className="text-xs text-red-400">비밀번호가 일치하지 않습니다.</p>
            )}
          </div>
          {pwError && (
            <p id="pw-error" role="alert" className="text-xs text-red-400">{pwError}</p>
          )}
          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={pwLoading || !currentPw || !newPw || !confirmPw || newPw !== confirmPw}
              className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm h-9 px-4 disabled:opacity-50"
            >
              {pwLoading ? '변경 중...' : '비밀번호 변경'}
            </Button>
          </div>
        </form>
      </section>

      {/* 계정 탈퇴 */}
      <section className="rounded-xl border border-red-900/40 bg-red-950/10 p-6 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-red-300">계정 탈퇴</h2>
          <p className="text-xs text-slate-500 mt-0.5">탈퇴 후에는 모든 데이터가 삭제되며 복구할 수 없습니다.</p>
        </div>
        <a
          href="/settings/account/delete"
          className="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors border border-red-800/50 hover:border-red-700 rounded-lg px-4 py-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
          </svg>
          계정 탈퇴 신청
        </a>
      </section>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
