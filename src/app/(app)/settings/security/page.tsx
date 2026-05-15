'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/auth/client'

type TotpFactor = { id: string; friendly_name?: string; status: 'verified' | 'unverified' }
type ViewState = 'loading' | 'no_mfa' | 'enrolling' | 'mfa_active'

export default function SecuritySettingsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [view, setView] = useState<ViewState>('loading')
  const [factor, setFactor] = useState<TotpFactor | null>(null)
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [showSecret, setShowSecret] = useState(false)

  const enrollFactorIdRef = useRef<string | null>(null)

  const loadFactors = useCallback(async () => {
    setView('loading')
    const { data, error: listErr } = await supabase.auth.mfa.listFactors()
    if (listErr) {
      setError('2단계 인증 정보를 불러오지 못했습니다. 페이지를 새로고침 해주세요.')
      setView('no_mfa')
      return
    }
    const verified = data?.totp?.find((f) => f.status === 'verified')
    if (verified) {
      setFactor(verified)
      setView('mfa_active')
    } else {
      setView('no_mfa')
    }
  }, [supabase])

  useEffect(() => { loadFactors() }, [loadFactors])

  async function startEnroll() {
    setLoading(true)
    setError(null)
    setSuccess(null)
    const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: '짐스캐너 B2B',
    })
    setLoading(false)
    if (enrollErr || !data) {
      setError('등록을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.')
      return
    }
    setEnrollFactorId(data.id)
    enrollFactorIdRef.current = data.id
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
    setVerifyCode('')
    setView('enrolling')
  }

  // 페이지 언마운트 시 미완료 factor 정리
  useEffect(() => {
    return () => {
      if (enrollFactorIdRef.current) {
        supabase.auth.mfa.unenroll({ factorId: enrollFactorIdRef.current }).catch(() => {})
        enrollFactorIdRef.current = null
      }
    }
  }, [supabase])

  async function confirmEnroll() {
    if (!enrollFactorId || verifyCode.replace(/\s/g, '').length !== 6) return
    setLoading(true)
    setError(null)
    const { error: verErr } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollFactorId,
      code: verifyCode.replace(/\s/g, ''),
    })
    setLoading(false)
    if (verErr) {
      setError('인증 코드가 올바르지 않습니다. OTP 앱에서 6자리 코드를 다시 확인해 주세요.')
      return
    }
    await fetch('/api/auth/mfa/enroll', { method: 'POST' }).catch(() => {})
    enrollFactorIdRef.current = null
    setSuccess('2단계 인증이 활성화되었습니다.')
    setVerifyCode('')
    await loadFactors()
  }

  async function confirmDisable() {
    if (!factor || disableCode.replace(/\s/g, '').length !== 6) return
    setLoading(true)
    setError(null)
    const { error: chalErr } = await supabase.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code: disableCode.replace(/\s/g, ''),
    })
    if (chalErr) {
      setError('인증 코드가 올바르지 않습니다.')
      setLoading(false)
      return
    }
    const { error: unenrollErr } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
    setLoading(false)
    if (unenrollErr) {
      setError('비활성화 중 오류가 발생했습니다. 다시 시도해 주세요.')
      return
    }
    await fetch('/api/auth/mfa/unenroll', { method: 'POST' }).catch(() => {})
    setShowDisableModal(false)
    setDisableCode('')
    setFactor(null)
    setSuccess('2단계 인증이 비활성화되었습니다.')
    setView('no_mfa')
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-300 bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="설정으로 돌아가기"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">보안 설정</h1>
          <p className="text-xs text-slate-400 mt-0.5">2단계 인증(TOTP)으로 계정을 보호하세요.</p>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div
          role="status"
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-sm"
        >
          <svg className="w-4 h-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          {success}
        </div>
      )}

      {/* Loading */}
      {view === 'loading' && (
        <div className="flex items-center justify-center py-20" aria-label="로딩 중" role="status">
          <div className="w-8 h-8 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin" />
        </div>
      )}

      {/* No MFA enrolled */}
      {view === 'no_mfa' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">2단계 인증 비활성화 상태</h2>
              <p className="text-sm text-slate-400 mt-1">
                2단계 인증을 활성화하면 비밀번호 외에 OTP 앱의 6자리 코드로 추가 인증이 필요합니다.
                Google Authenticator, Authy, Microsoft Authenticator 등을 사용할 수 있습니다.
              </p>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200/50 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}
          <Button
            onClick={startEnroll}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50"
          >
            {loading ? '준비 중…' : '2단계 인증 활성화'}
          </Button>
        </div>
      )}

      {/* Enrolling — QR + verify */}
      {view === 'enrolling' && qrCode && (
        <div className="rounded-xl border border-indigo-200 bg-white p-6 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-1">OTP 앱으로 QR 코드 스캔</h2>
            <p className="text-sm text-slate-400">
              Google Authenticator 또는 Authy에서 QR 코드를 스캔하세요.
              스캔 후 앱에 표시되는 6자리 코드를 입력하면 활성화됩니다.
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-xl">
              {/* Supabase returns SVG string */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/svg+xml,${encodeURIComponent(qrCode)}`}
                alt="2단계 인증 QR 코드"
                width={180}
                height={180}
                className="block"
              />
            </div>
          </div>

          {/* Manual secret */}
          {secret && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-xs text-slate-400 mb-2">QR 스캔이 안 된다면 수동으로 코드를 입력하세요</p>
              <div className="flex items-center gap-2">
                <code className={`flex-1 text-xs font-mono text-slate-500 ${!showSecret ? 'blur-sm select-none' : ''} transition-all`}>
                  {secret}
                </code>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-xs text-slate-400 hover:text-slate-500 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                >
                  {showSecret ? '숨기기' : '표시'}
                </button>
              </div>
            </div>
          )}

          {/* Verify code */}
          <div className="space-y-3">
            <label htmlFor="verify-code" className="block text-sm font-medium text-slate-500">
              OTP 앱에서 생성된 6자리 코드
            </label>
            <div aria-live="polite" className="space-y-3">
              <Input
                id="verify-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9 ]*"
                maxLength={7}
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, '')
                  setVerifyCode(v)
                  setError(null)
                }}
                autoComplete="one-time-code"
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500 tracking-widest text-center text-lg font-mono max-w-[160px]"
                aria-describedby={error ? 'verify-error' : undefined}
                aria-invalid={!!error}
              />
              {error && (
                <p id="verify-error" role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={confirmEnroll}
                disabled={loading || verifyCode.length !== 6}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50"
              >
                {loading ? '확인 중…' : '활성화 완료'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  if (enrollFactorId) {
                    await supabase.auth.mfa.unenroll({ factorId: enrollFactorId }).catch(() => {})
                    enrollFactorIdRef.current = null
                  }
                  setView('no_mfa')
                  setError(null)
                  setQrCode(null)
                  setSecret(null)
                  setEnrollFactorId(null)
                }}
                className="text-slate-400 hover:text-slate-900"
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MFA Active */}
      {view === 'mfa_active' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">2단계 인증 활성화됨</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                  보호 중
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                로그인 시 비밀번호와 OTP 앱의 6자리 코드를 모두 입력해야 합니다.
                OTP 앱 분실 시 계정 복구가 어려울 수 있으므로 앱을 안전하게 보관하세요.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setShowDisableModal(true)
              setDisableCode('')
              setError(null)
            }}
            className="border-red-200/60 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
          >
            2단계 인증 비활성화
          </Button>
        </div>
      )}

      {/* Disable Modal */}
      {showDisableModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="disable-modal-title"
        >
          <div className="w-full max-w-sm mx-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-2xl space-y-5">
            <div>
              <h3 id="disable-modal-title" className="text-lg font-semibold text-slate-900 mb-1">
                2단계 인증 비활성화 확인
              </h3>
              <p className="text-sm text-slate-400">
                비활성화하려면 현재 OTP 앱에서 생성된 6자리 코드를 입력하세요.
              </p>
            </div>
            <div aria-live="polite" className="space-y-3">
              <label htmlFor="disable-code" className="block text-sm font-medium text-slate-500">
                현재 OTP 코드
              </label>
              <Input
                id="disable-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={disableCode}
                onChange={(e) => {
                  setDisableCode(e.target.value.replace(/[^0-9]/g, ''))
                  setError(null)
                }}
                autoComplete="one-time-code"
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-red-500 tracking-widest text-center text-lg font-mono"
                aria-describedby={error ? 'disable-error' : undefined}
                aria-invalid={!!error}
              />
              {error && (
                <p id="disable-error" role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={confirmDisable}
                disabled={loading || disableCode.length !== 6}
                className="flex-1 bg-red-700 hover:bg-red-600 text-white font-semibold disabled:opacity-50"
              >
                {loading ? '처리 중…' : '비활성화'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDisableModal(false)
                  setError(null)
                }}
                disabled={loading}
                className="flex-1 text-slate-400 hover:text-slate-900 border border-slate-200"
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">참고 사항</h3>
        <ul className="space-y-1.5 text-xs text-slate-400">
          <li className="flex items-start gap-2">
            <span className="text-slate-400 mt-0.5">•</span>
            Google Authenticator, Authy, Microsoft Authenticator 앱을 지원합니다.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-400 mt-0.5">•</span>
            OTP 앱을 분실하면 계정 복구가 어려울 수 있습니다. 앱을 여러 기기에 백업하세요.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-400 mt-0.5">•</span>
            2단계 인증 활성화 시 로그인마다 추가 코드 입력이 필요합니다.
          </li>
        </ul>
      </div>
    </div>
  )
}
