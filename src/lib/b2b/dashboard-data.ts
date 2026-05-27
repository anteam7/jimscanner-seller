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
      .select('plan_code, monthly_order_used, monthly_order_limit')
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

  return {
    monthOrderCount: monthOrderCount ?? 0,
    monthSaleKrw,
    skuCount: skuCount ?? 0,
    subscription: (subRows as DashboardStats['subscription'][] | null)?.[0] ?? null,
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
