'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/auth/client'
import { SignupProgress } from '@/components/b2b/SignupProgress'
import { SignupHeader } from '@/components/b2b/SignupHeader'

const RESEND_COOLDOWN = 60

export default function SignupStep3Page() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  const [checking, setChecking] = useState(false)
  const [resendMsg, setResendMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email)
    })
  }, [])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((v) => v - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || !email) return
    setResendMsg(null)
    setError(null)
    setResending(true)
    const supabase = createClient()
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    setResending(false)
    if (resendError) {
      setError('재발송에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } else {
      setResendMsg('인증 이메일을 다시 발송했습니다. 받은 편지함을 확인해 주세요.')
      setResendCooldown(RESEND_COOLDOWN)
    }
  }, [email, resendCooldown])

  const handleContinue = useCallback(async () => {
    setError(null)
    setChecking(true)
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    setChecking(false)
    if (data.user?.email_confirmed_at) {
      router.push('/signup/step-4')
    } else {
      setError('이메일 인증이 아직 완료되지 않았습니다. 받은 편지함의 인증 링크를 클릭해 주세요.')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <SignupHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <SignupProgress currentStep={2} />

        <div className="w-full max-w-md">
          {/* 이메일 아이콘 */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-2 text-center">이메일을 확인해 주세요</h1>
          <p className="text-slate-400 text-sm text-center mb-2">
            아래 이메일 주소로 인증 링크를 발송했습니다.
          </p>
          {email && (
            <p className="text-indigo-700 font-medium text-center text-sm mb-6 break-all">
              {email}
            </p>
          )}

          {/* 안내 박스 */}
          <div className="rounded-lg border border-slate-300 bg-white px-4 py-4 mb-6 space-y-2">
            <p className="text-sm font-medium text-slate-800">인증 방법</p>
            <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
              <li>받은 편지함(또는 스팸함)에서 짐스캐너 이메일을 찾으세요.</li>
              <li><span className="text-slate-900 font-medium">&apos;이메일 인증하기&apos;</span> 버튼을 클릭하세요.</li>
              <li>인증 완료 후 아래 &apos;인증 완료, 다음 단계로&apos; 버튼을 누르세요.</li>
            </ol>
          </div>

          {/* 성공 메시지 */}
          {resendMsg && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 mb-4">
              {resendMsg}
            </div>
          )}

          {/* 오류 메시지 */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleContinue}
              disabled={checking}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-11 disabled:opacity-50"
            >
              {checking ? '확인 중…' : '인증 완료, 다음 단계로'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="w-full border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-900 h-10 disabled:opacity-50"
            >
              {resending
                ? '발송 중…'
                : resendCooldown > 0
                ? `재발송 대기 (${resendCooldown}초)`
                : '인증 이메일 재발송'}
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            이메일이 오지 않는 경우 스팸함을 확인하거나,{' '}
            <a href="mailto:support@jimscanner.co.kr" className="text-slate-400 hover:text-slate-900 underline">
              고객센터
            </a>
            에 문의해 주세요.
          </p>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200">
        © 2026 짐스캐너. 사업자 서비스는 현재 베타 운영 중입니다.
      </footer>
    </div>
  )
}
