'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth/client'

export default function AccountSuspendedPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [suspendedReason, setSuspendedReason] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReason() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('b2b_accounts')
        .select('suspended_reason')
        .eq('user_id', user.id)
        .maybeSingle()

      setSuspendedReason(data?.suspended_reason ?? null)
    }
    fetchReason()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogout() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10 border border-orange-500/20">
          <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold mb-2">계정이 정지되었습니다</h1>
        <p className="text-slate-400 text-sm mb-4">
          운영 정책 위반으로 인해 계정 이용이 일시 정지되었습니다.
        </p>

        {suspendedReason && (
          <div className="rounded-lg border border-orange-800/50 bg-orange-950/30 px-4 py-3 text-sm text-orange-300 text-left mb-6">
            <p className="font-medium text-orange-200 mb-1">정지 사유</p>
            <p>{suspendedReason}</p>
          </div>
        )}

        <p className="text-slate-500 text-sm mb-8">
          정지 해제를 요청하시거나 이의가 있으시면{' '}
          <a href="mailto:support@jimscanner.co.kr" className="text-indigo-400 hover:text-indigo-300 underline">
            support@jimscanner.co.kr
          </a>
          로 문의해 주세요.
        </p>

        <button
          onClick={handleLogout}
          disabled={loading}
          className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors disabled:opacity-50"
        >
          {loading ? '로그아웃 중…' : '로그아웃'}
        </button>
      </div>
    </div>
  )
}
