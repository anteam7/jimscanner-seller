'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendReset(targetEmail: string): Promise<void> {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      if (res.status === 429) {
        throw new Error('잠시 후 다시 시도해 주세요. (5분 내 요청 횟수 초과)')
      }
      throw new Error(data.error ?? '요청 처리 중 오류가 발생했습니다.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await sendReset(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <Link href="/login" className="text-lg font-bold text-indigo-400 tracking-tight">
          짐스캐너 B2B
        </Link>
        <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
          로그인으로 돌아가기
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {sent ? (
            <SentState email={email} onResend={() => sendReset(email)} />
          ) : (
            <RequestForm
              email={email}
              setEmail={setEmail}
              loading={loading}
              error={error}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-600 border-t border-slate-800">
        © 2026 짐스캐너. 사업자 서비스는 현재 베타 운영 중입니다.
      </footer>
    </div>
  )
}

function RequestForm({
  email,
  setEmail,
  loading,
  error,
  onSubmit,
}: {
  email: string
  setEmail: (v: string) => void
  loading: boolean
  error: string | null
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <>
      <div className="mb-8">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-indigo-900/40 border border-indigo-700 flex items-center justify-center">
            <svg className="w-7 h-7 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2 text-center">비밀번호 재설정</h1>
        <p className="text-slate-400 text-sm text-center">
          가입한 이메일 주소를 입력하시면 재설정 링크를 보내드립니다.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
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
            className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-950/60 border border-red-800 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-11 disabled:opacity-50"
        >
          {loading ? '처리 중…' : '재설정 이메일 보내기'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        비밀번호가 기억나셨나요?{' '}
        <Link
          href="/login"
          className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          로그인
        </Link>
      </p>
    </>
  )
}

const RESEND_COOLDOWN_SECONDS = 30

function SentState({ email, onResend }: { email: string; onResend: () => Promise<void> }) {
  const [cooldown, setCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function handleResend() {
    setResending(true)
    setResendError(null)
    try {
      await onResend()
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setResendError(err instanceof Error ? err.message : '재전송 중 오류가 발생했습니다.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-green-900/40 border border-green-700 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">이메일을 확인해 주세요</h1>
        <p className="text-slate-400 text-sm">
          <span className="text-white font-medium">{email}</span>로
          비밀번호 재설정 링크를 보냈습니다.
        </p>
        <p className="text-slate-500 text-xs mt-1">
          이메일이 도착하지 않으면 스팸함을 확인하거나 아래 버튼으로 다시 보내주세요.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400 text-left space-y-2">
        <p className="font-medium text-slate-300">안내</p>
        <ul className="space-y-1 list-disc list-inside text-xs">
          <li>링크는 발송 후 1시간 동안 유효합니다.</li>
          <li>링크 클릭 후 새 비밀번호를 설정할 수 있습니다.</li>
          <li>이메일이 없으시면 입력한 주소가 가입된 주소인지 확인해 주세요.</li>
        </ul>
      </div>

      {resendError && (
        <div role="alert" className="rounded-lg bg-red-950/60 border border-red-800 px-4 py-3 text-sm text-red-300">
          {resendError}
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <Button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resending
            ? '전송 중…'
            : cooldown > 0
            ? `다시 보내기 (${cooldown}초 후 가능)`
            : '다시 보내기'}
        </Button>

        <Link
          href="/login"
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2"
        >
          로그인 페이지로 돌아가기
        </Link>
      </div>
    </div>
  )
}
