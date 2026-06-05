'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'

/**
 * 이메일 인증 안내 — 가입(step-1) 후 인증 메일이 발송됨을 명확히 알리고 재전송 제공.
 * 흐름을 막지 않음: 사업자 정보 입력은 계속 진행 가능하되, 인증을 완료해야 모든 기능 사용.
 * 이미 인증된 경우 작은 완료 표시.
 */
export function EmailVerifyNotice() {
  const [email, setEmail] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<boolean | null>(null)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      const u = data.user
      setEmail(u?.email ?? null)
      setConfirmed(!!u?.email_confirmed_at)
    }).catch(() => {
      // 네트워크 실패 시 정보성 배너는 숨긴 채(confirmed=null) 유지 — 흐름 비차단.
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function resend() {
    if (!email) return
    setResending(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
      })
      if (err) setError(err.message)
      else setResent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '재전송 실패')
    } finally {
      setResending(false)
    }
  }

  // 로딩 중이거나 이미 인증 완료 시 큰 배너 숨김
  if (confirmed === null) return null
  if (confirmed) {
    return (
      <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700">
        ✓ 이메일 인증 완료
      </div>
    )
  }

  return (
    <div className="mb-5 rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-3">
      <p className="text-sm font-semibold text-indigo-900">📧 인증 메일을 보냈습니다</p>
      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
        {email ? <span className="font-medium text-slate-800">{email}</span> : '가입하신 이메일'} 로 보낸 인증 링크를
        클릭해 주세요 (스팸함도 확인). 약관 동의·사업자 정보는 계속 진행할 수 있지만,
        <span className="font-medium"> 모든 기능 사용에는 이메일 인증이 필요</span>합니다.
      </p>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={resend}
          disabled={resending || resent}
          aria-busy={resending}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md text-indigo-700 border border-indigo-200 bg-white hover:bg-indigo-50 disabled:opacity-50 transition-colors"
        >
          {resending ? '재전송 중…' : resent ? '재전송 완료' : '인증 메일 재전송'}
        </button>
        {resent && <span className="text-[11px] text-emerald-700">메일을 다시 보냈습니다.</span>}
        {error && <span className="text-[11px] text-rose-600">{error}</span>}
      </div>
    </div>
  )
}
