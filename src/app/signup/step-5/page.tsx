'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/auth/client'
import { SignupProgress } from '@/components/b2b/SignupProgress'
import { SignupHeader } from '@/components/b2b/SignupHeader'

type VerifyState = 'idle' | 'loading' | 'success' | 'failed' | 'error'
type FailReason = 'suspended' | 'closed' | 'unknown' | null

const FAIL_MESSAGES: Record<string, string> = {
  suspended: '국세청 조회 결과 해당 사업자는 현재 휴업 상태입니다. 영업 중인 사업자만 가입할 수 있습니다.',
  closed: '국세청 조회 결과 해당 사업자는 폐업 처리된 상태입니다. 영업 중인 사업자만 가입할 수 있습니다.',
  unknown: '국세청 데이터베이스에서 해당 사업자등록번호를 확인할 수 없습니다. 번호가 올바른지 확인 후 4단계로 돌아가 수정해 주세요.',
}

export default function SignupStep5Page() {
  const router = useRouter()
  const [authLoading, setAuthLoading] = useState(true)
  const [alreadyVerified, setAlreadyVerified] = useState(false)
  const [verifyState, setVerifyState] = useState<VerifyState>('idle')
  const [failReason, setFailReason] = useState<FailReason>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace('/signup/step-1')
        return
      }
      if (!data.user.email_confirmed_at) {
        router.replace('/signup/step-3')
        return
      }
      // step-4 완료 가드: business_no 없으면 step-4로 리다이렉트
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: account } = await (supabase as any)
        .from('b2b_accounts')
        .select('business_no')
        .eq('user_id', data.user.id)
        .single()
      if (!account?.business_no) {
        router.replace('/signup/step-4')
        return
      }
      setAuthLoading(false)
    })
  }, [router])

  const handleVerify = useCallback(async () => {
    setVerifyState('loading')
    setFailReason(null)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/verify-business', { method: 'POST' })
      const body = await res.json().catch(() => ({})) as {
        ok?: boolean
        status?: string
        alreadyVerified?: boolean
        error?: string
      }

      if (res.ok && body.ok) {
        if (body.alreadyVerified) setAlreadyVerified(true)
        setVerifyState('success')
        return
      }

      if (res.status === 422 && body.status && body.status !== 'active') {
        setFailReason(body.status as FailReason)
        setVerifyState('failed')
        return
      }

      setErrorMsg(body.error ?? '진위 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      setVerifyState('error')
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.')
      setVerifyState('error')
    }
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <SignupHeader />

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-10">
        <SignupProgress currentStep={4} />

        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-bold mb-1">사업자등록번호 진위 확인</h1>
          <p className="text-slate-400 text-sm mb-8">
            국세청 데이터베이스에서 입력하신 사업자등록번호의 영업 상태를 자동으로 확인합니다.
          </p>

          {verifyState === 'idle' && (
            <VerifyPrompt onVerify={handleVerify} />
          )}

          {verifyState === 'loading' && (
            <VerifyLoading />
          )}

          {verifyState === 'success' && (
            <VerifySuccess
              alreadyVerified={alreadyVerified}
              onNext={() => router.push('/signup/step-6')}
            />
          )}

          {verifyState === 'failed' && failReason && (
            <VerifyFailed
              reason={failReason}
              message={FAIL_MESSAGES[failReason] ?? '확인 중 오류가 발생했습니다.'}
            />
          )}

          {verifyState === 'error' && (
            <VerifyError
              message={errorMsg ?? '알 수 없는 오류가 발생했습니다.'}
              onRetry={handleVerify}
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

function VerifyPrompt({ onVerify }: { onVerify: () => void }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-indigo-900/60 border border-indigo-700/50 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">국세청 공식 API 연동</p>
            <p className="text-xs text-slate-400 mt-1">
              국세청 사업자등록정보 조회 서비스를 통해 실시간으로 영업 상태를 확인합니다. 입력하신 정보는 확인 목적 외 사용되지 않습니다.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">자동 확인 (약 5초 소요)</p>
            <p className="text-xs text-slate-400 mt-1">
              확인 완료 시 인증 레벨이 L1으로 상승하며 Lite 플랜 이용이 가능해집니다.
            </p>
          </div>
        </div>
      </div>

      <Button
        onClick={onVerify}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-11"
      >
        사업자등록번호 진위 확인하기
      </Button>

      <p className="text-center text-xs text-slate-500">
        4단계 정보를 수정하려면{' '}
        <Link href="/signup/step-4" className="text-indigo-400 hover:underline">
          이전 단계로 돌아가기
        </Link>
      </p>
    </div>
  )
}

function VerifyLoading() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-8 flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-slate-200">국세청 조회 중…</p>
        <p className="text-xs text-slate-500">잠시만 기다려 주세요.</p>
      </div>
    </div>
  )
}

function VerifySuccess({ alreadyVerified, onNext }: { alreadyVerified: boolean; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-green-800 bg-green-950/40 p-6 flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-full bg-green-900/60 border border-green-700/50 flex items-center justify-center">
          <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-bold text-green-300">진위 확인 완료</p>
          <p className="text-sm text-slate-400 mt-1">
            {alreadyVerified
              ? '이미 인증된 사업자입니다.'
              : '계속사업자로 확인되었습니다. 인증 레벨이 L1로 상승했습니다.'}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-900/40 border border-green-800/60">
          <span className="text-xs font-medium text-green-400">✓ 인증 레벨 L1</span>
          <span className="text-xs text-slate-500">Lite 플랜 이용 가능</span>
        </div>
      </div>

      <Button
        onClick={onNext}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-11"
      >
        다음 단계 — 사업자등록증 업로드 (선택)
      </Button>
    </div>
  )
}

function VerifyFailed({ reason, message }: { reason: FailReason; message: string }) {
  const labels: Record<string, string> = {
    suspended: '휴업 사업자',
    closed: '폐업 사업자',
    unknown: '미확인',
  }
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-red-800 bg-red-950/40 p-6 flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-full bg-red-900/60 border border-red-700/50 flex items-center justify-center">
          <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <p className="text-base font-bold text-red-300">
            {reason ? labels[reason] : '확인 실패'}
          </p>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400 space-y-2">
        <p className="font-medium text-slate-300">다음 사항을 확인해 주세요</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>사업자등록번호가 정확히 입력되었는지 확인해 주세요.</li>
          <li>영업 중인 사업자 기준으로만 가입이 가능합니다.</li>
          <li>새로 개업한 경우 국세청 등록 반영에 1~2일 소요될 수 있습니다.</li>
        </ul>
      </div>

      <Link
        href="/signup/step-4"
        className="block text-center w-full py-3 rounded-lg border border-slate-700 text-sm text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
      >
        4단계로 돌아가 수정하기
      </Link>
    </div>
  )
}

function VerifyError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-700 bg-amber-950/40 p-6 flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-900/40 border border-amber-700/50 flex items-center justify-center">
          <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <div>
          <p className="text-base font-bold text-amber-300">일시적 오류</p>
          <p className="text-sm text-slate-400 mt-1">{message}</p>
        </div>
      </div>

      <Button
        onClick={onRetry}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-11"
      >
        다시 시도하기
      </Button>

      <Link
        href="/signup/step-4"
        className="block text-center w-full py-3 rounded-lg border border-slate-700 text-sm text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
      >
        4단계로 돌아가 사업자 정보 수정하기
      </Link>
    </div>
  )
}
