'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type SubscriptionInfo = {
  status: string
  plan_name: string
  current_period_end: string | null
} | null

type Step = 'warning' | 'confirm' | 'done'

export default function AccountDeletePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('warning')
  const [subscription, setSubscription] = useState<SubscriptionInfo>(null)
  const [loadingSub, setLoadingSub] = useState(true)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/info')
      if (!res.ok) return
      const data = await res.json()
      if (data.subscription && ['active', 'trial', 'past_due'].includes(data.subscription.status)) {
        setSubscription({
          status: data.subscription.status,
          plan_name: data.subscription.plan_name ?? data.subscription.plan_code ?? '유료 플랜',
          current_period_end: data.subscription.current_period_end ?? null,
        })
      }
    } catch {
      // 구독 정보 로드 실패 시 무시
    } finally {
      setLoadingSub(false)
    }
  }, [])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  async function handleDelete() {
    if (!password.trim()) {
      setError('비밀번호를 입력해 주세요.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '오류가 발생했습니다.')
        return
      }
      setStep('done')
      setTimeout(() => router.push('/login?deleted=true'), 3000)
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-100">탈퇴 처리가 완료되었습니다</h2>
          <p className="text-slate-400 text-sm">탈퇴 확인 이메일이 발송되었습니다.<br/>3초 후 로그인 페이지로 이동합니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* 헤더 */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Link href="/settings/account" className="text-slate-400 hover:text-slate-300 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold text-slate-100">계정 탈퇴</h1>
        </div>
        <p className="text-sm text-slate-400 pl-6">개인정보보호법 §21에 따라 탈퇴 자유를 보장합니다</p>
      </div>

      {step === 'warning' && (
        <div className="space-y-4">
          {/* 탈퇴 안내 */}
          <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z" />
              </svg>
              <h2 className="text-base font-semibold text-red-300">탈퇴 전 반드시 확인해 주세요</h2>
            </div>
            <ul className="space-y-2 text-sm text-red-200/80 list-disc list-inside pl-1">
              <li>모든 주문·의뢰자·설정 데이터가 영구 삭제됩니다</li>
              <li>동일 사업자등록번호로 재가입은 <strong>30일 후</strong>부터 가능합니다</li>
              <li>탈퇴 후에는 계정 복구가 불가능합니다</li>
            </ul>
          </div>

          {/* 활성 구독 경고 */}
          {!loadingSub && subscription && (
            <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <p className="text-sm font-medium text-amber-300">
                  현재 <strong>{subscription.plan_name}</strong> 구독이 활성화되어 있습니다
                </p>
              </div>
              <p className="text-sm text-amber-200/70 pl-6">
                탈퇴 즉시 구독이 취소됩니다.
                {subscription.current_period_end && (
                  <> 환불은 제공되지 않으며, <a href="/support?type=refund_inquiry" className="underline hover:text-amber-200 transition-colors">환불 정책</a>을 참조해 주세요.</>
                )}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Link href="/settings/account"
              className="flex-1 inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
              취소
            </Link>
            <Button
              onClick={() => setStep('confirm')}
              variant="destructive"
              className="flex-1 bg-red-700 hover:bg-red-600 text-white"
            >
              계속 진행
            </Button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-200 mb-1">비밀번호로 신원 확인</h2>
              <p className="text-sm text-slate-400">탈퇴를 완료하려면 현재 비밀번호를 입력해 주세요.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="delete-password" className="block text-sm font-medium text-slate-300">
                현재 비밀번호
              </label>
              <div className="relative">
                <Input
                  id="delete-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null) }}
                  onKeyDown={(e) => e.key === 'Enter' && !submitting && handleDelete()}
                  placeholder="현재 비밀번호 입력"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'delete-error' : undefined}
                  className="bg-slate-900/60 border-slate-700 text-slate-100 placeholder:text-slate-500 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
              {error && (
                <p id="delete-error" role="alert" className="text-xs text-red-400">
                  {error}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep('warning')}
              className="flex-1 inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              이전
            </button>
            <Button
              onClick={handleDelete}
              disabled={submitting || !password.trim()}
              variant="destructive"
              className="flex-1 bg-red-700 hover:bg-red-600 text-white disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  처리 중…
                </span>
              ) : (
                '탈퇴 확정'
              )}
            </Button>
          </div>

          <p className="text-xs text-slate-500 text-center">
            탈퇴 후에는 복구가 불가능합니다. 신중히 결정해 주세요.
          </p>
        </div>
      )}
    </div>
  )
}
