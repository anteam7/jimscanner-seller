import { createAdminClient } from '@/lib/auth/admin-supabase'

/**
 * 카드 한도 임박 계산 — 주문 입력 등 "행동 시점" 경고에 재사용.
 * /settings/cards 의 이달 매입 합계 로직과 동일 (b2b_orders!inner 로 account 격리).
 */
export type NearLimitCard = {
  id: string
  alias: string
  last4: string | null
  used: number
  limit: number
  pct: number
}

const NEAR_LIMIT_PCT = 0.8

/** 이달 한도 80% 이상 사용한 active 카드 목록 (사용률 내림차순). 없으면 빈 배열. */
export async function getNearLimitCards(accountId: string): Promise<NearLimitCard[]> {
  const admin = createAdminClient()

  const { data: cardsRaw } = await admin
    .from('b2b_payment_cards')
    .select('id, alias, last4, credit_limit_krw')
    .eq('account_id', accountId)
    .is('deleted_at', null)
    .eq('is_active', true)

  type CardRow = { id: string; alias: string; last4: string | null; credit_limit_krw: number | null }
  const cards = (cardsRaw ?? []) as CardRow[]
  const limited = cards.filter((c) => c.credit_limit_krw != null && c.credit_limit_krw > 0)
  if (limited.length === 0) return []

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const spend: Record<string, number> = {}
  try {
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
      .eq('b2b_orders.account_id', accountId)
    const lines = (linesRaw ?? []) as unknown as LineRow[]
    for (const ln of lines) {
      if (!ln.payment_card_id || ln.total_price_krw == null) continue
      const krw = Number(ln.total_price_krw)
      if (Number.isFinite(krw)) spend[ln.payment_card_id] = (spend[ln.payment_card_id] ?? 0) + krw
    }
  } catch {
    // 합계 실패해도 빈 경고로 fallback (조용히)
    return []
  }

  return limited
    .map((c) => {
      const used = spend[c.id] ?? 0
      const limit = c.credit_limit_krw as number
      return { id: c.id, alias: c.alias, last4: c.last4, used, limit, pct: Math.round((used / limit) * 100) }
    })
    .filter((c) => c.pct >= NEAR_LIMIT_PCT * 100)
    .sort((a, b) => b.pct - a.pct)
}
