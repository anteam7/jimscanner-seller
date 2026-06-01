/**
 * #idea-22 — SKU 매입가 추세 + 인상 경고.
 * b2b_order_items.unit_price_foreign 를 통화별 시계열로 모아
 * 평균/최저/최고 + "최근 vs 평균" 델타% 를 계산한다.
 * 매입가는 통화가 섞이면 의미가 없으므로 환산 없이 통화별로만 집계한다 (DB 변경 0).
 *
 * - getSkuPriceTrend: 단건 SKU 의 통화별 상세 추세 (/products/[id])
 * - getRecentSkuPriceHints: 계정 전체 SKU 의 대표 통화 요약 (/orders/new 인라인 힌트)
 */
import { createAdminClient } from '@/lib/auth/admin-supabase'

/** 최근 매입가가 평균 대비 이 % 를 초과해 오르면 인상 경고 (amber) */
export const PRICE_HIKE_WARN_PCT = 10

export type PriceTrendPoint = {
  date: string // 주문일 (YYYY-MM-DD)
  price: number // unit_price_foreign
}

export type CurrencyTrend = {
  currency: string
  count: number // 매입 라인 수
  avg: number
  min: number
  max: number
  recent: number // 가장 최근 매입 단가
  recentDate: string
  /** (recent - avg) / avg * 100. avg<=0 이면 null */
  deltaPct: number | null
  points: PriceTrendPoint[] // 오래된 → 최근 순
}

type ItemTrendRow = {
  unit_price_foreign: number | string | null
  currency: string | null
  b2b_orders: { order_date: string | null; created_at: string } | null
}

function rowDate(r: ItemTrendRow): string {
  const d = r.b2b_orders?.order_date || r.b2b_orders?.created_at || ''
  return d ? d.slice(0, 10) : ''
}

/** 단건 SKU 의 통화별 매입가 추세. 매입 라인 많은 통화 순으로 정렬. */
export async function getSkuPriceTrend(
  accountId: string,
  productId: string,
): Promise<CurrencyTrend[]> {
  const admin = createAdminClient()

  const { data: rows } = await admin
    .from('b2b_order_items')
    .select(
      'unit_price_foreign, currency, b2b_orders!inner(account_id, deleted_at, order_date, created_at)',
    )
    .eq('product_id', productId)
    .eq('b2b_orders.account_id', accountId)
    .is('b2b_orders.deleted_at', null)
    .not('unit_price_foreign', 'is', null)

  const items = (rows as ItemTrendRow[] | null) ?? []
  if (items.length === 0) return []

  // 통화별 그룹
  const byCurrency = new Map<string, { date: string; price: number }[]>()
  for (const it of items) {
    const cur = (it.currency || '').toUpperCase()
    if (!cur) continue
    const price = Number(it.unit_price_foreign)
    if (!Number.isFinite(price) || price <= 0) continue
    const date = rowDate(it)
    if (!date) continue
    const arr = byCurrency.get(cur) ?? []
    arr.push({ date, price })
    byCurrency.set(cur, arr)
  }

  const trends: CurrencyTrend[] = []
  for (const [currency, raw] of byCurrency) {
    if (raw.length === 0) continue
    const sorted = raw.slice().sort((a, b) => a.date.localeCompare(b.date))
    const prices = sorted.map((p) => p.price)
    const sum = prices.reduce((s, p) => s + p, 0)
    const avg = sum / prices.length
    const recent = sorted[sorted.length - 1]
    const deltaPct = avg > 0 ? ((recent.price - avg) / avg) * 100 : null
    trends.push({
      currency,
      count: prices.length,
      avg,
      min: Math.min(...prices),
      max: Math.max(...prices),
      recent: recent.price,
      recentDate: recent.date,
      deltaPct,
      points: sorted.map((p) => ({ date: p.date, price: p.price })),
    })
  }

  return trends.sort((a, b) => b.count - a.count)
}

export type SkuPriceHint = {
  currency: string
  count: number
  avg: number
  recent: number
  deltaPct: number | null
}

type BulkItemRow = {
  product_id: string | null
  unit_price_foreign: number | string | null
  currency: string | null
  b2b_orders: { order_date: string | null; created_at: string } | null
}

/**
 * 계정 전체 SKU 의 대표 통화 매입가 요약 (product_id → hint).
 * 가장 최근 매입에 쓰인 통화를 대표로 잡고, 그 통화의 평균·최근·델타% 를 계산.
 * /orders/new 에서 SKU 선택 시 인라인 힌트로 사용.
 */
export async function getRecentSkuPriceHints(
  accountId: string,
): Promise<Record<string, SkuPriceHint>> {
  const admin = createAdminClient()

  const { data: rows } = await admin
    .from('b2b_order_items')
    .select(
      'product_id, unit_price_foreign, currency, b2b_orders!inner(account_id, deleted_at, order_date, created_at)',
    )
    .not('product_id', 'is', null)
    .eq('b2b_orders.account_id', accountId)
    .is('b2b_orders.deleted_at', null)
    .not('unit_price_foreign', 'is', null)

  const items = (rows as BulkItemRow[] | null) ?? []
  if (items.length === 0) return {}

  // product_id → currency → points
  const byProduct = new Map<string, Map<string, { date: string; price: number }[]>>()
  for (const it of items) {
    if (!it.product_id) continue
    const cur = (it.currency || '').toUpperCase()
    if (!cur) continue
    const price = Number(it.unit_price_foreign)
    if (!Number.isFinite(price) || price <= 0) continue
    const date = rowDate(it)
    if (!date) continue
    let curMap = byProduct.get(it.product_id)
    if (!curMap) {
      curMap = new Map()
      byProduct.set(it.product_id, curMap)
    }
    const arr = curMap.get(cur) ?? []
    arr.push({ date, price })
    curMap.set(cur, arr)
  }

  const hints: Record<string, SkuPriceHint> = {}
  for (const [pid, curMap] of byProduct) {
    // 대표 통화 = 가장 최근 매입의 통화
    let bestCur = ''
    let bestDate = ''
    for (const [cur, arr] of curMap) {
      for (const p of arr) {
        if (p.date > bestDate) {
          bestDate = p.date
          bestCur = cur
        }
      }
    }
    if (!bestCur) continue
    const arr = (curMap.get(bestCur) ?? []).slice().sort((a, b) => a.date.localeCompare(b.date))
    if (arr.length === 0) continue
    const prices = arr.map((p) => p.price)
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length
    const recent = arr[arr.length - 1].price
    hints[pid] = {
      currency: bestCur,
      count: prices.length,
      avg,
      recent,
      deltaPct: avg > 0 ? ((recent - avg) / avg) * 100 : null,
    }
  }

  return hints
}
