'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/auth/client'

function ResetSuccessToast({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인하세요.
      <button
        onClick={onDismiss}
        className="ml-1 text-emerald-600 hover:text-slate-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 rounded"
        aria-label="닫기"
      >
        ✕
      </button>
    </div>
  )
}

function SellerLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showResetToast, setShowResetToast] = useState(
    () => searchParams.get('reset') === 'success'
  )

  useEffect(() => {
    if (searchParams.get('reset') === 'success') {
      const params = new URLSearchParams(window.location.search)
      params.delete('reset')
      const qs = params.toString()
      window.history.replaceState({}, '', location.pathname + (qs ? '?' + qs : ''))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (signInError) {
      const msg = signInError.message.toLowerCase()
      if (msg.includes('invalid login credentials') || msg.includes('invalid')) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      } else if (msg.includes('email not confirmed')) {
        setError('이메일 인증이 필요합니다. 가입 시 발송된 메일을 확인해 주세요.')
      } else {
        setError(signInError.message)
      }
      return
    }

    const nextPath = searchParams.get('next')
    const safeNext = nextPath && nextPath.startsWith('/') ? nextPath : '/dashboard'

    // MFA 필요 여부 확인: aal1 → aal2 필요 시 challenge 페이지로 이동 (?next= 전달)
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel === 'aal1') {
      router.push(`/auth/mfa-challenge?next=${encodeURIComponent(safeNext)}`)
      return
    }

    router.push(safeNext)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 relative overflow-hidden">
      {/* 배경 — signup 과 동일 톤 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(99,102,241,0.18),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-image:radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
      />

      {showResetToast && <ResetSuccessToast onDismiss={() => setShowResetToast(false)} />}

      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <Link href="/signup" className="inline-flex items-center gap-2" aria-label="짐스캐너 홈">
          <Image
            src="/jimscanner-logo.png"
            alt="짐스캐너"
            width={120}
            height={28}
            priority
            className="h-7 w-auto"
          />
          <span className="text-[10px] font-bold tracking-wider text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-0.5">
            SELLER
          </span>
        </Link>
        <Link href="/signup" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
          <span className="hidden sm:inline">계정이 없으신가요? </span>
          <span className="text-indigo-600 font-medium">회원가입 →</span>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* 로그인 카드 */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xl p-8">
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 mb-3 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-[11px] font-semibold text-indigo-700">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                SELLER 로그인
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
                다시 오신 것을 환영합니다
              </h1>
              <p className="text-slate-600 text-sm">
                해외 직구 셀러 운영 자동화 도구
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  이메일
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="text-xs font-semibold text-slate-700">
                    비밀번호
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    비밀번호 찾기
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="비밀번호 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-700"
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold h-11 shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
              >
                {loading ? '로그인 중…' : '로그인'}
              </Button>
            </form>
          </div>

          <p className="mt-5 text-center text-sm text-slate-600">
            사업자 계정이 없으신가요?{' '}
            <Link
              href="/signup"
              className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
            >
              무료로 시작하기 →
            </Link>
          </p>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-500 border-t border-slate-200 bg-white">
        © 2026 짐스캐너 SELLER · seller.jimscanner.co.kr
      </footer>
    </div>
  )
}

export default function SellerLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" role="status" aria-label="로딩 중" />
      </div>
    }>
      <SellerLoginContent />
    </Suspense>
  )
}
