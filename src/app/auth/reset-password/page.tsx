'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/auth/client'

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '12자 이상', ok: password.length >= 12 },
    { label: '영문 대문자', ok: /[A-Z]/.test(password) },
    { label: '숫자', ok: /\d/.test(password) },
    { label: '특수문자', ok: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password) },
  ]
  const score = checks.filter((c) => c.ok).length
  const color = score <= 1 ? 'bg-red-500' : score === 2 ? 'bg-amber-500' : score === 3 ? 'bg-blue-500' : 'bg-green-500'

  if (!password) return null

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < score ? color : 'bg-slate-300'}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <span key={c.label} className={`text-xs ${c.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
            {c.ok ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function validatePassword(pw: string): string | null {
  if (pw.length < 12) return '비밀번호는 12자 이상이어야 합니다.'
  if (!/[A-Z]/.test(pw)) return '영문 대문자를 포함해야 합니다.'
  if (!/\d/.test(pw)) return '숫자를 포함해야 합니다.'
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pw)) return '특수문자를 포함해야 합니다.'
  return null
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session)
      setChecking(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const pwError = validatePassword(password)
    if (pwError) { setError(pwError); return }
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message || '비밀번호 변경에 실패했습니다. 다시 시도해 주세요.')
      return
    }

    await supabase.auth.signOut()
    router.push('/login?reset=success')
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center gap-4">
        <div
          className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"
          role="status"
          aria-label="처리 중"
        />
        <p className="text-slate-400 text-sm">처리 중입니다…</p>
      </div>
    )
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <header className="flex items-center px-6 py-4 border-b border-slate-200">
          <Link href="/login" className="text-lg font-bold text-indigo-600 tracking-tight">
            짐스캐너 B2B
          </Link>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-md text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-red-900/40 border border-red-200 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-bold">링크가 만료되었거나 유효하지 않습니다</h1>
            <p className="text-slate-400 text-sm">
              비밀번호 재설정 링크는 1시간 동안만 유효합니다.<br />
              새 링크를 요청해 주세요.
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-block mt-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              새 링크 요청하기
            </Link>
          </div>
        </main>
        <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200">
          © 2026 짐스캐너. 사업자 서비스는 현재 베타 운영 중입니다.
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="flex items-center px-6 py-4 border-b border-slate-200">
        <Link href="/login" className="text-lg font-bold text-indigo-600 tracking-tight">
          짐스캐너 B2B
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-700 flex items-center justify-center">
                <svg className="w-7 h-7 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2 text-center">새 비밀번호 설정</h1>
            <p className="text-slate-400 text-sm text-center">
              새 비밀번호를 입력해 주세요.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-500 mb-1.5">
                새 비밀번호
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="12자 이상 · 대문자 · 숫자 · 특수문자"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500 pr-10"
                />
                <button
                  type="button"
                  aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 transition-colors"
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-slate-500 mb-1.5">
                비밀번호 확인
              </label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="비밀번호 재입력"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  aria-invalid={confirm.length > 0 && password !== confirm}
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500 pr-10"
                />
                <button
                  type="button"
                  aria-label={showConfirm ? '비밀번호 숨기기' : '비밀번호 보기'}
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 transition-colors"
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {confirm && password !== confirm && (
                <p className="mt-1 text-xs text-red-600">비밀번호가 일치하지 않습니다.</p>
              )}
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
              disabled={loading || (confirm.length > 0 && password !== confirm)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-11 disabled:opacity-50"
            >
              {loading ? '변경 중…' : '비밀번호 변경하기'}
            </Button>
          </form>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200">
        © 2026 짐스캐너. 사업자 서비스는 현재 베타 운영 중입니다.
      </footer>
    </div>
  )
}
