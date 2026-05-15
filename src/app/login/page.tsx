'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {showResetToast && <ResetSuccessToast onDismiss={() => setShowResetToast(false)} />}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <Link href="/signup" className="text-lg font-bold text-indigo-600 tracking-tight">
          짐스캐너 B2B
        </Link>
        <Link href="/signup" className="text-sm text-slate-400 hover:text-slate-900 transition-colors">
          계정이 없으신가요?{' '}
          <span className="text-indigo-600 font-medium">회원가입</span>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1">로그인</h1>
            <p className="text-slate-400 text-sm">
              짐스캐너 B2B 사업자 포털에 오신 것을 환영합니다.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-500 mb-1.5">
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
                <label htmlFor="password" className="text-sm font-medium text-slate-500">
                  비밀번호
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none focus-visible:text-indigo-600"
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
                className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-11 disabled:opacity-50"
            >
              {loading ? '로그인 중…' : '로그인'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            사업자 계정이 없으신가요?{' '}
            <Link
              href="/signup"
              className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              무료로 시작하기
            </Link>
          </p>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200">
        © 2026 짐스캐너. 사업자 서비스는 현재 베타 운영 중입니다.
      </footer>
    </div>
  )
}

export default function SellerLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" role="status" aria-label="로딩 중" />
      </div>
    }>
      <SellerLoginContent />
    </Suspense>
  )
}
