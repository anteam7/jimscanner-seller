'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const RESEND_COOLDOWN = 60

function AuthCallbackContent() {
  const searchParams = useSearchParams()
  const errorMsg = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((v) => v - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const handleResend = useCallback(async () => {
    if (!email || resendCooldown > 0) return
    setResendMsg(null)
    setResendError(null)
    setResending(true)
    const res = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setResending(false)
    if (!res.ok) {
      setResendError('재발송에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } else {
      setResendMsg('인증 이메일을 다시 발송했습니다. 받은 편지함을 확인해 주세요.')
      setResendCooldown(RESEND_COOLDOWN)
    }
  }, [email, resendCooldown])

  if (!errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center gap-4">
        <div
          className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"
          role="status"
          aria-label="인증 처리 중"
        />
        <p className="text-slate-400 text-sm">인증 처리 중입니다. 잠시만 기다려 주세요…</p>
      </div>
    )
  }

  const isExpired =
    errorMsg.toLowerCase().includes('expired') ||
    errorMsg.toLowerCase().includes('만료') ||
    errorMsg.toLowerCase().includes('invalid')

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <Link href="/signup" className="text-lg font-bold text-indigo-600 tracking-tight">
          짐스캐너 B2B
        </Link>
        <Link href="/login" className="text-sm text-slate-400 hover:text-slate-900 transition-colors">
          이미 계정이 있으신가요? <span className="text-indigo-600 font-medium">로그인</span>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* 아이콘 */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-red-900/40 border border-red-200 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">
              {isExpired ? '인증 링크가 만료되었습니다' : '인증에 실패했습니다'}
            </h1>
            <p className="text-slate-400 text-sm">
              {isExpired
                ? '이메일 인증 링크의 유효 기간이 지났습니다. 아래에서 새 인증 이메일을 요청하세요.'
                : '인증 처리 중 문제가 발생했습니다. 다시 시도하거나 고객센터에 문의해 주세요.'}
            </p>
          </div>

          {/* 재발송 폼 */}
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-5 space-y-4">
            <p className="text-sm font-medium text-slate-800">인증 이메일 재발송</p>
            <div>
              <label htmlFor="resend-email" className="block text-xs font-medium text-slate-400 mb-1.5">
                가입 이메일 주소
              </label>
              <Input
                id="resend-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500"
              />
            </div>

            {resendMsg && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700" role="status">
                {resendMsg}
              </div>
            )}

            {resendError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
                {resendError}
              </div>
            )}

            <Button
              onClick={handleResend}
              disabled={resending || resendCooldown > 0 || !email}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-11 disabled:opacity-50"
            >
              {resending
                ? '발송 중…'
                : resendCooldown > 0
                ? `재발송 대기 (${resendCooldown}초)`
                : '인증 이메일 재발송'}
            </Button>
          </div>

          <div className="flex flex-col gap-2 text-center">
            <Link
              href="/login"
              className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors underline underline-offset-2"
            >
              로그인 페이지로 돌아가기
            </Link>
            <p className="text-xs text-slate-400">
              계속 문제가 발생하면{' '}
              <a href="mailto:support@jimscanner.co.kr" className="text-slate-400 hover:text-slate-900 underline">
                고객센터
              </a>
              에 문의해 주세요.
            </p>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200">
        © 2026 짐스캐너. 사업자 서비스는 현재 베타 운영 중입니다.
      </footer>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center gap-4">
      <div
        className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"
        role="status"
        aria-label="인증 처리 중"
      />
      <p className="text-slate-400 text-sm">인증 처리 중입니다. 잠시만 기다려 주세요…</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  )
}
