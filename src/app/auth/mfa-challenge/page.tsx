'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/auth/client'

function MfaChallengeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initError, setInitError] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [failCount, setFailCount] = useState(0)
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const [cooldownSecs, setCooldownSecs] = useState(0)

  useEffect(() => {
    if (!cooldownUntil) return
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))
      setCooldownSecs(remaining)
      if (remaining === 0) {
        setCooldownUntil(null)
        clearInterval(interval)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [cooldownUntil])

  const nextPath = searchParams.get('next')
  const safeNext = nextPath && nextPath.startsWith('/') ? nextPath : '/dashboard'

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data, error: listErr }) => {
      if (listErr || !data?.totp?.length) {
        setInitError(true)
        return
      }
      const verified = data.totp.find((f) => f.status === 'verified')
      if (!verified) {
        // No verified TOTP — skip challenge
        router.replace(safeNext)
        return
      }
      setFactorId(verified.id)
    })
  // safeNext is derived from URL params which don't change during mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, router])

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.replace('/login')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId || code.replace(/\s/g, '').length !== 6) return
    setLoading(true)
    setError(null)

    const { data: challengeData, error: chalErr } = await supabase.auth.mfa.challenge({ factorId })
    if (chalErr || !challengeData) {
      setError('인증 챌린지 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      setLoading(false)
      return
    }

    const { error: verErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: code.replace(/\s/g, ''),
    })
    setLoading(false)

    if (verErr) {
      const nextFail = failCount + 1
      setFailCount(nextFail)
      if (nextFail >= 5) {
        const until = Date.now() + 30_000
        setCooldownUntil(until)
        setCooldownSecs(30)
        setError('코드를 5회 잘못 입력했습니다. 30초 후 다시 시도해 주세요.')
      } else {
        setError('코드가 올바르지 않습니다. OTP 앱에서 최신 코드를 확인해 주세요.')
      }
      return
    }
    setFailCount(0)

    router.push(safeNext)
    router.refresh()
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <p className="text-slate-400 text-sm">
            2단계 인증 정보를 불러오지 못했습니다.
          </p>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-block text-indigo-400 hover:text-indigo-300 text-sm transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded"
          >
            {signingOut ? '로그아웃 중…' : '로그인 페이지로 돌아가기'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="flex items-center px-6 py-4 border-b border-slate-800">
        <span className="text-lg font-bold text-indigo-400 tracking-tight">짐스캐너 B2B</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-1">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-900/40 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold">2단계 인증</h1>
            <p className="text-slate-400 text-sm">
              OTP 앱(Google Authenticator 등)에서 생성된 6자리 코드를 입력하세요.
            </p>
          </div>

          {cooldownUntil && (
            <div role="alert" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-sm">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              잠시 후 다시 시도해 주세요 ({cooldownSecs}초)
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="mfa-code" className="block text-sm font-medium text-slate-300 mb-1.5">
                인증 코드
              </label>
              <div aria-live="polite" className="space-y-2">
                <Input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/[^0-9]/g, ''))
                    if (!cooldownUntil) setError(null)
                  }}
                  autoComplete="one-time-code"
                  autoFocus
                  disabled={!!cooldownUntil}
                  className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500 tracking-widest text-center text-2xl font-mono h-14 disabled:opacity-50"
                  aria-describedby={error ? 'mfa-error' : undefined}
                  aria-invalid={!!error}
                />
                {error && (
                  <p id="mfa-error" role="alert" className="text-sm text-red-400 text-center">
                    {error}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || code.length !== 6 || !factorId || !!cooldownUntil}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-11 disabled:opacity-50"
            >
              {loading ? '확인 중…' : cooldownUntil ? `재시도 대기 (${cooldownSecs}초)` : '확인'}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <Link
              href="/login"
              className="block text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              다른 계정으로 로그인
            </Link>
            <Link
              href="/support?type=mfa_recovery"
              className="block text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              OTP 앱에 접근할 수 없나요?
            </Link>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-600 border-t border-slate-800">
        © 2026 짐스캐너. 사업자 서비스는 현재 베타 운영 중입니다.
      </footer>
    </div>
  )
}

export default function MfaChallengePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" role="status" aria-label="로딩 중" />
      </div>
    }>
      <MfaChallengeContent />
    </Suspense>
  )
}
