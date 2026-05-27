import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import ExtensionTokenManager from './ExtensionTokenManager'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '브라우저 확장 · 짐스캐너 SELLER',
  description: '아마존 US/JP·라쿠텐·야후 주문 페이지에서 매입 정보를 자동 수집하는 확장 설정.',
  robots: { index: false, follow: false },
}

type TokenRow = {
  id: string
  label: string
  token_prefix: string
  last_used_at: string | null
  created_at: string
  revoked_at: string | null
}

export default async function ExtensionSettingsPage() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return <div className="p-8 text-sm text-slate-600">로그인이 필요합니다.</div>

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return <div className="p-8 text-sm text-slate-600">사업자 계정이 없습니다.</div>

  const admin = createAdminClient()
  const { data: tokenRows } = await admin
    .from('b2b_seller_tokens')
    .select('id, label, token_prefix, last_used_at, created_at, revoked_at')
    .eq('account_id', account.id)
    .order('created_at', { ascending: false })
    .limit(20)
    .returns<TokenRow[]>()

  const tokens = tokenRows ?? []

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <Link href="/settings" className="text-xs text-slate-500 hover:text-slate-700">← 설정</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">브라우저 확장</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          아마존 US/JP·라쿠텐·야후 주문 페이지에서 매입 정보를 한 번에 짐스캐너로 가져옵니다.
        </p>
      </header>

      <section className="rounded-lg bg-white shadow-sm border border-slate-200 border-l-[3px] border-l-indigo-500 px-5 py-4">
        <h2 className="text-sm font-bold text-slate-900">설치 가이드</h2>
        <ol className="mt-2 text-xs text-slate-700 space-y-1.5 list-decimal list-inside">
          <li>아래에서 <b>API 토큰</b>을 발급합니다 (1회만 표시됨 — 안전한 곳에 저장).</li>
          <li>짐스캐너 확장을 Chrome 에 설치합니다 (베타 — 별도 안내).</li>
          <li>확장 popup 에 발급받은 토큰을 붙여넣고 저장.</li>
          <li>amazon.com Your Orders 페이지에서 <b>"짐스캐너로 가져오기"</b> 버튼 클릭.</li>
          <li><Link href="/imports" className="text-indigo-700 font-semibold underline underline-offset-2">/imports</Link> 에서 수집된 영수증을 확인.</li>
        </ol>
      </section>

      <ExtensionTokenManager initialTokens={tokens} />

      <p className="text-[11px] text-slate-400">
        토큰이 노출된 경우 즉시 revoke 하고 새로 발급하세요. 토큰 한 개로 모든 매입처 수집이 가능합니다.
      </p>
    </div>
  )
}
