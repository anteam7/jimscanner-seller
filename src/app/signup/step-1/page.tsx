'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/auth/client'
import { SignupProgress } from '@/components/b2b/SignupProgress'
import { SignupHeader } from '@/components/b2b/SignupHeader'

const PW_CHECKS = [
  { label: '12자 이상', test: (pw: string) => pw.length >= 12 },
  { label: '영문 대문자', test: (pw: string) => /[A-Z]/.test(pw) },
  { label: '숫자', test: (pw: string) => /\d/.test(pw) },
  { label: '특수문자', test: (pw: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pw) },
]

function PasswordStrength({ password }: { password: string }) {
  const checks = PW_CHECKS.map((c) => ({ label: c.label, ok: c.test(password) }))
  const score = checks.filter((c) => c.ok).length
  const barColor =
    score <= 1 ? 'bg-red-500' : score === 2 ? 'bg-amber-500' : score === 3 ? 'bg-blue-500' : 'bg-green-500'

  if (!password) return null

  return (
    <div className="mt-2 space-y-1" aria-live="polite">
      <div className="flex gap-1" role="presentation">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < score ? barColor : 'bg-slate-300'}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <span key={c.label} className={`text-xs transition-colors ${c.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
            {c.ok ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function validatePassword(pw: string): string | null {
  for (const { label, test } of PW_CHECKS) {
    if (!test(pw)) return `${label} 조건을 충족해야 합니다.`
  }
  return null
}

function validateEmail(email: string): string | null {
  if (!email) return '이메일을 입력해 주세요.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '올바른 이메일 형식을 입력해 주세요.'
  return null
}

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-600" role="alert">{message}</p>
}

export default function SignupStep1Page() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [pwTouched, setPwTouched] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [loading, setLoading] = useState(false)

  const emailError = emailTouched ? validateEmail(email) : null
  const pwError = pwTouched ? validatePassword(password) : null
  const confirmError = confirmTouched && confirm && password !== confirm ? '비밀번호가 일치하지 않습니다.' : null

  const confirmMismatch = confirm.length > 0 && password !== confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setAlreadyRegistered(false)
    setEmailTouched(true)
    setPwTouched(true)
    setConfirmTouched(true)

    if (validateEmail(email) || validatePassword(password) || password !== confirm) return

    setLoading(true)
    const supabase = createClient()
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    setLoading(false)

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes('already registered')) {
        setAlreadyRegistered(true)
      } else {
        setSubmitError(signUpError.message)
      }
      return
    }

    // Supabase email enumeration protection: already-registered emails return
    // no error but user.identities === [] (no new identity was created)
    if (!signUpData?.user || signUpData.user.identities?.length === 0) {
      setAlreadyRegistered(true)
      return
    }

    router.push('/signup/step-2')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <SignupHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <SignupProgress currentStep={0} />

        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold mb-1">계정 만들기</h1>
          <p className="text-slate-400 text-sm mb-8">이메일과 비밀번호를 설정하세요.</p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* 이메일 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-500 mb-1.5">
                이메일 <span className="text-red-600">*</span>
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setAlreadyRegistered(false) }}
                onBlur={() => setEmailTouched(true)}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : undefined}
                className={`bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500
                  ${emailError ? 'border-red-600 focus-visible:ring-red-500' : emailTouched && !emailError ? 'border-green-600' : ''}`}
              />
              <FieldError message={emailError ?? undefined} />
              {emailError && <span id="email-error" className="sr-only">{emailError}</span>}
            </div>

            {/* 비밀번호 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-500 mb-1.5">
                비밀번호 <span className="text-red-600">*</span>
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
                  onBlur={() => setPwTouched(true)}
                  aria-invalid={!!pwError}
                  aria-describedby={pwError ? 'pw-error' : undefined}
                  className={`pr-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500
                    ${pwError ? 'border-red-600 focus-visible:ring-red-500' : pwTouched && !pwError ? 'border-green-600' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-500 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
              {pwError && <FieldError message={pwError} />}
              {pwError && <span id="pw-error" className="sr-only">{pwError}</span>}
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-slate-500 mb-1.5">
                비밀번호 확인 <span className="text-red-600">*</span>
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
                  onBlur={() => setConfirmTouched(true)}
                  aria-invalid={!!confirmError}
                  aria-describedby={confirmError ? 'confirm-error' : undefined}
                  className={`pr-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500
                    ${confirmMismatch ? 'border-red-600 focus-visible:ring-red-500' : confirmTouched && confirm && !confirmMismatch ? 'border-green-600' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-500 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmMismatch && (
                <p id="confirm-error" className="mt-1 text-xs text-red-600" role="alert">
                  비밀번호가 일치하지 않습니다.
                </p>
              )}
            </div>

            {alreadyRegistered && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
                이미 가입된 이메일입니다.{' '}
                <Link href="/login" className="underline text-indigo-600 hover:text-indigo-700">
                  로그인
                </Link>
                {' '}또는{' '}
                <Link href="/auth/forgot-password" className="underline text-indigo-600 hover:text-indigo-700">
                  비밀번호 재설정
                </Link>
                을 이용하세요.
              </div>
            )}
            {submitError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
                {submitError}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || confirmMismatch || alreadyRegistered}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-11 disabled:opacity-50"
            >
              {loading ? '처리 중…' : '다음 단계로'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            가입하면 이용약관·개인정보처리방침에 동의하는 것으로 간주됩니다. (2단계에서 명시적 동의 진행)
          </p>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200">
        © 2026 짐스캐너. 사업자 서비스는 현재 베타 운영 중입니다.
      </footer>
    </div>
  )
}
