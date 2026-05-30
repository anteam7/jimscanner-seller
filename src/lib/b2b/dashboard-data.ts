/**
 * Dashboard 페이지의 통계 데이터를 60초 unstable_cache 로 묶음.
 *
 * 키: account_id — 사용자별 격리. RLS 우회를 위해 admin client 사용하되
 * account_id 가 본인 것이므로 안전 (호출 측에서 createClient 로 인증 검증 후 본인 account_id 만 넘김).
 */
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export type RecentOrder = {
  id: string
  order_number: string
  market_order_number: string | null
  marketplace: string | null
  status: string
  buyer_name: string | null
  created_at: string
  b2b_order_items: { product_name: string; sale_price_krw: number | string | null }[] | null
}

export type DashboardStats = {
  monthOrderCount: number
  monthSaleKrw: number
  skuCount: number
  subscription: { plan_code: string; monthly_order_used: number; monthly_order_limit: number | null } | null
  recentOrders: RecentOrder[]
  statusCounts: Record<string, number>
}

export type DailyBucket = {
  date: string // YYYY-MM-DD (KST)
  orderCount: number
  saleKrw: number
}

export type SevenDayTrend = {
  daily: DailyBucket[] // 14 entries, oldest first
  thisOrders: number
  prevOrders: number
  thisSaleKrw: number
  prevSaleKrw: number
  wowOrdersPct: number | null // null when prevOrders === 0
  wowSalePct: number | null
}

async function fetchDashboardStats(accountId: string): Promise<DashboardStats> {
  const admin = createAdminClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: monthOrderCount },
    { data: subRows },
    { data: monthOrderItems },
    { count: skuCount },
    { data: recentOrdersRaw },
    { data: statusRowsRaw },
  ] = await Promise.all([
    admin
      .from('b2b_orders')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .is('deleted_at', null)
      .gte('created_at', monthStart),
    admin
      .from('b2b_subscriptions')
      .select('monthly_order_used, monthly_order_quota_override, b2b_subscription_plans(plan_code, monthly_order_quota)')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(1),
    admin
      .from('b2b_order_items')
      .select('sale_price_krw, b2b_orders!inner(account_id, deleted_at, created_at)')
      .eq('b2b_orders.account_id', accountId)
      .is('b2b_orders.deleted_at', null)
      .gte('b2b_orders.created_at', monthStart),
    admin
      .from('b2b_products')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('is_active', true),
    admin
      .from('b2b_orders')
      .select('id, order_number, market_order_number, marketplace, status, buyer_name, created_at, b2b_order_items(product_name, sale_price_krw)')
      .eq('account_id', accountId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
    admin
      .from('b2b_orders')
      .select('status')
      .eq('account_id', accountId)
      .is('deleted_at', null)
      .gte('created_at', monthStart),
  ])

  type ItemRow = { sale_price_krw: number | string | null }
  const monthSaleKrw = ((monthOrderItems as ItemRow[] | null) ?? []).reduce((acc, it) => {
    const v = it.sale_price_krw
    if (v == null || v === '') return acc
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? acc + n : acc
  }, 0)

  type StatusRow = { status: string }
  const statusCounts: Record<string, number> = {}
  for (const r of (statusRowsRaw as StatusRow[] | null) ?? []) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1
  }

  // b2b_subscriptions 에는 plan_code·월 한도 컬럼이 없어 plan 조인 결과에서 파생한다.
  // (월 한도 = 개별 override ?? 플랜 기본 quota, null = 무제한)
  type SubRow = {
    monthly_order_used: number | null
    monthly_order_quota_override: number | null
    b2b_subscription_plans: { plan_code: string | null; monthly_order_quota: number | null } | null
  }
  const subRow = (subRows as SubRow[] | null)?.[0] ?? null
  const subscription: DashboardStats['subscription'] = subRow
    ? {
        plan_code: subRow.b2b_subscription_plans?.plan_code ?? '',
        monthly_order_used: subRow.monthly_order_used ?? 0,
        monthly_order_limit:
          subRow.monthly_order_quota_override ??
          subRow.b2b_subscription_plans?.monthly_order_quota ??
          null,
      }
    : null

  return {
    monthOrderCount: monthOrderCount ?? 0,
    monthSaleKrw,
    skuCount: skuCount ?? 0,
    subscription,
    recentOrders: (recentOrdersRaw as RecentOrder[] | null) ?? [],
    statusCounts,
  }
}

/**
 * 60초 동안 동일 accountId 의 stats 를 캐싱.
 * key 에 accountId 를 포함해 사용자별 격리.
 */
export async function getDashboardStats(accountId: string): Promise<DashboardStats> {
  const cached = unstable_cache(
    () => fetchDashboardStats(accountId),
    ['dashboard-stats', accountId],
    { revalidate: 60, tags: [`dashboard:${accountId}`] },
  )
  return cached()
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

function kstDateKey(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const k = new Date(t + KST_OFFSET_MS)
  const y = k.getUTCFullYear()
  const m = String(k.getUTCMonth() + 1).padStart(2, '0')
  const d = String(k.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function kstTodayKey(nowMs: number): string {
  const k = new Date(nowMs + KST_OFFSET_MS)
  const y = k.getUTCFullYear()
  const m = String(k.getUTCMonth() + 1).padStart(2, '0')
  const d = String(k.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function shiftKstDate(key: string, deltaDays: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const base = Date.UTC(y, m - 1, d)
  const shifted = new Date(base + deltaDays * 24 * 60 * 60 * 1000)
  const yy = shifted.getUTCFullYear()
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(shifted.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

async function fetchSevenDayTrend(accountId: string, nowMs: number): Promise<SevenDayTrend> {
  const admin = createAdminClient()
  const fourteenDaysAgo = new Date(nowMs - 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data: ordersRaw } = await admin
    .from('b2b_orders')
    .select('created_at, b2b_order_items(sale_price_krw)')
    .eq('account_id', accountId)
    .is('deleted_at', null)
    .gte('created_at', fourteenDaysAgo)

  type Row = { created_at: string; b2b_order_items: { sale_price_krw: number | string | null }[] | null }
  const buckets = new Map<string, { orderCount: number; saleKrw: number }>()
  for (const row of (ordersRaw as Row[] | null) ?? []) {
    const key = kstDateKey(row.created_at)
    if (!key) continue
    const b = buckets.get(key) ?? { orderCount: 0, saleKrw: 0 }
    b.orderCount += 1
    for (const it of row.b2b_order_items ?? []) {
      const v = it.sale_price_krw
      if (v == null || v === '') continue
      const n = typeof v === 'number' ? v : Number(v)
      if (Number.isFinite(n)) b.saleKrw += n
    }
    buckets.set(key, b)
  }

  const today = kstTodayKey(nowMs)
  const daily: DailyBucket[] = []
  for (let i = 13; i >= 0; i--) {
    const date = shiftKstDate(today, -i)
    const b = buckets.get(date)
    daily.push({ date, orderCount: b?.orderCount ?? 0, saleKrw: b?.saleKrw ?? 0 })
  }

  const thisWeek = daily.slice(7)
  const prevWeek = daily.slice(0, 7)
  const thisOrders = thisWeek.reduce((a, b) => a + b.orderCount, 0)
  const prevOrders = prevWeek.reduce((a, b) => a + b.orderCount, 0)
  const thisSaleKrw = thisWeek.reduce((a, b) => a + b.saleKrw, 0)
  const prevSaleKrw = prevWeek.reduce((a, b) => a + b.saleKrw, 0)

  const wowOrdersPct = prevOrders > 0 ? ((thisOrders - prevOrders) / prevOrders) * 100 : null
  const wowSalePct = prevSaleKrw > 0 ? ((thisSaleKrw - prevSaleKrw) / prevSaleKrw) * 100 : null

  return { daily, thisOrders, prevOrders, thisSaleKrw, prevSaleKrw, wowOrdersPct, wowSalePct }
}

export async function getSevenDayTrend(accountId: string, nowMs: number): Promise<SevenDayTrend> {
  // 캐시 키: account_id + KST 일자. 같은 날 안에서는 60초 캐시.
  const dayKey = kstTodayKey(nowMs)
  const cached = unstable_cache(
    () => fetchSevenDayTrend(accountId, nowMs),
    ['dashboard-trend-7d', accountId, dayKey],
    { revalidate: 60, tags: [`dashboard:${accountId}`] },
  )
  return cached()
}
