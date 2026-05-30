import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'
import { getNearLimitCards } from '@/lib/b2b/card-limits'
import NewOrderForm, { type ForwarderOption } from './NewOrderForm'

export const metadata: Metadata = {
  title: '새 주문 입력',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

export default async function NewOrderPage() {
  const supabase = await createClient()

  // forwarders 는 public read 허용 (main repo schema)
  const { data: rows } = await supabase
    .from('forwarders')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .returns<ForwarderOption[]>()

  const forwarders = rows ?? []

  // 행동 시점 경고: 한도 임박 카드가 있으면 주문 입력 화면 상단에 노출
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let nearLimitCards: Awaited<ReturnType<typeof getNearLimitCards>> = []
  if (user) {
    const { data: account } = await supabase
      .from('b2b_accounts')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (account) nearLimitCards = await getNearLimitCards(account.id)
  }

  return (
    <>
      {nearLimitCards.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-4 md:pt-6">
          <div className="rounded-lg bg-gradient-to-r from-amber-50 to-white border border-amber-200 shadow-sm px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">⚠ 한도 임박 카드 {nearLimitCards.length}장</p>
            <ul className="mt-1.5 space-y-1">
              {nearLimitCards.map((c) => (
                <li key={c.id} className="text-[12px] text-amber-700">
                  <span className="font-medium">{c.alias}</span>
                  {c.last4 && <span className="text-amber-600/70"> ···· {c.last4}</span>} — 이달{' '}
                  {c.used.toLocaleString()}원 / 한도 {c.limit.toLocaleString()}원{' '}
                  <span className={`font-semibold ${c.pct >= 100 ? 'text-rose-600' : 'text-amber-800'}`}>
                    ({c.pct}%{c.pct >= 100 ? ' 초과' : ''})
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[11px] text-amber-600/80">
              매입 라인에 카드를 매핑하기 전 한도를 확인하세요. {' '}
              <Link href="/settings/cards" className="underline hover:text-amber-800">카드 관리 →</Link>
            </p>
          </div>
        </div>
      )}
      <NewOrderForm forwarders={forwarders} />
    </>
  )
}
