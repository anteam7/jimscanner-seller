import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import PaymentCardsManager from './PaymentCardsManager'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '결제 카드 · 짐스캐너 SELLER',
  description: '매입 시 사용하는 결제 카드 별칭·결제일·한도 관리.',
  robots: { index: false, follow: false },
}

type CardRow = {
  id: string
  account_id: string
  alias: string
  brand: string | null
  last4: string | null
  color: string | null
  credit_limit_krw: number | null
  billing_day: number | null
  sort_order: number
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export default async function PaymentCardsPage() {
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
  const { data: cards } = await admin
    .from('b2b_payment_cards')
    .select(
      'id, account_id, alias, brand, last4, color, credit_limit_krw, billing_day, sort_order, is_active, notes, created_at, updated_at',
    )
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .order('is_active', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const rows: CardRow[] = (cards ?? []) as CardRow[]
  const activeCount = rows.filter((r) => r.is_active).length
  const archivedCount = rows.length - activeCount

  // #idea-4 후속: 카드별 이달 매입 합계 (KRW) — 한도 대비 사용률 추적용.
  // dashboard CardSpendCard 와 동일 로직 (b2b_orders!inner 로 account 격리).
  const spendByCard: Record<string, { krw: number; lineCount: number }> = {}
  if (rows.length > 0) {
    try {
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      type LineRow = {
        payment_card_id: string | null
        total_price_krw: number | string | null
        b2b_orders: { account_id: string; order_date: string } | null
      }
      const { data: linesRaw } = await admin
        .from('b2b_order_items')
        .select('payment_card_id, total_price_krw, b2b_orders!inner(account_id, order_date)')
        .not('payment_card_id', 'is', null)
        .gte('b2b_orders.order_date', monthStart.toISOString())
        .eq('b2b_orders.account_id', account.id)
      const lines = (linesRaw ?? []) as unknown as LineRow[]
      for (const ln of lines) {
        if (!ln.payment_card_id) continue
        const bucket = spendByCard[ln.payment_card_id] ?? { krw: 0, lineCount: 0 }
        bucket.lineCount += 1
        if (ln.total_price_krw != null) {
          const krw = Number(ln.total_price_krw)
          if (Number.isFinite(krw)) bucket.krw += krw
        }
        spendByCard[ln.payment_card_id] = bucket
      }
    } catch {
      // 합계 실패해도 카드 목록은 정상 노출
    }
  }

  // 한도 대비 80% 이상 사용한 active 카드 (경고 배너용)
  const NEAR_LIMIT_PCT = 0.8
  const overLimitCards = rows.filter((c) => {
    if (!c.is_active || c.credit_limit_krw == null || c.credit_limit_krw <= 0) return false
    const used = spendByCard[c.id]?.krw ?? 0
    return used / c.credit_limit_krw >= NEAR_LIMIT_PCT
  })

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <Link href="/settings" className="text-xs text-slate-500 hover:text-slate-700">← 설정</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">결제 카드</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          매입 시 사용한 카드를 라인에 매핑해서 카드별 매입 합계·청구 예정액을 추적합니다.
          카드 번호 전체는 저장하지 않으며 별칭과 마지막 4자리만 기록합니다.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg bg-white shadow-sm border-l-[3px] border-l-indigo-500 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">사용 중</p>
          <p className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">{activeCount}장</p>
        </div>
        <div className="rounded-lg bg-white shadow-sm border-l-[3px] border-l-slate-400 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">보관</p>
          <p className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">{archivedCount}장</p>
        </div>
      </div>

      {overLimitCards.length > 0 && (
        <div className="rounded-lg bg-gradient-to-r from-amber-50 to-white border border-amber-200 shadow-sm px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">⚠ 한도 임박 카드 {overLimitCards.length}장</p>
          <ul className="mt-1.5 space-y-1">
            {overLimitCards.map((c) => {
              const used = spendByCard[c.id]?.krw ?? 0
              const pct = Math.round((used / (c.credit_limit_krw as number)) * 100)
              return (
                <li key={c.id} className="text-[12px] text-amber-700">
                  <span className="font-medium">{c.alias}</span>
                  {c.last4 && <span className="text-amber-600/70"> ···· {c.last4}</span>} —{' '}
                  이달 {used.toLocaleString()}원 / 한도 {(c.credit_limit_krw as number).toLocaleString()}원{' '}
                  <span className={`font-semibold ${pct >= 100 ? 'text-rose-600' : 'text-amber-800'}`}>
                    ({pct}%{pct >= 100 ? ' 초과' : ''})
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-1.5 text-[11px] text-amber-600/80">
            이달 매입 라인의 원화 합계 기준입니다. 결제일·실제 청구액과 다를 수 있습니다.
          </p>
        </div>
      )}

      <PaymentCardsManager initialCards={rows} spendByCard={spendByCard} />

      <p className="text-[11px] text-slate-400">
        ※ 보안: 본 카드 번호 전체와 CVC, 유효기간은 저장하지 않습니다 (PCI-DSS 회피). 별칭·마지막 4자리·결제일만 저장합니다.
      </p>
    </div>
  )
}
