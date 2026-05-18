/**
 * H3 — 마진 손실 알림.
 * SKU 의 default_unit_price + default_currency 를 현 환율로 KRW 환산하고,
 * 같은 SKU 가 최근 30일 동안 어떤 sale_price_krw 로 팔렸는지 평균을 구해
 * (환산 매입가 + 평균 배대지비 6,000원) > 최근 평균 판매가 → 손실 위험 알림.
 *
 * 호출 측에서 환율(rates) 을 주입 — 한 번 fetch 한 결과 재사용.
 */
import { createAdminClient } from '@/lib/auth/admin-supabase'

export type MarginLossAlert = {
  product_id: string
  product_name: string
  seller_sku: string
  default_unit_price_krw: number
  recent_avg_sale_krw: number
  recent_order_count: number
  loss_per_unit_krw: number
}

const SHIPPING_EST_KRW = 6000

export async function getMarginLossAlerts(
  accountId: string,
  rates: Record<string, { rate: number; unit: number }>,
): Promise<MarginLossAlert[]> {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adb = admin as any

  const { data: skuRows } = await adb
    .from('b2b_products')
    .select('id, seller_sku, display_name, default_unit_price, default_currency')
    .eq('account_id', accountId)
    .eq('is_active', true)
    .not('default_unit_price', 'is', null)
    .not('default_currency', 'is', null)
  type SkuRow = {
    id: string
    seller_sku: string
    display_name: string
    default_unit_price: number | string | null
    default_currency: string | null
  }
  const skus = (skuRows as SkuRow[] | null) ?? []
  if (skus.length === 0) return []

  // 환산 매입가 (KRW) 계산
  const skuKrw = new Map<string, { name: string; sku: string; krwCost: number }>()
  for (const s of skus) {
    if (!s.default_currency) continue
    const price = Number(s.default_unit_price)
    if (!Number.isFinite(price) || price <= 0) continue
    if (s.default_currency === 'KRW') {
      skuKrw.set(s.id, { name: s.display_name, sku: s.seller_sku, krwCost: price })
      continue
    }
    const r = rates[s.default_currency]
    if (!r) continue
    const krw = Math.round((price * r.rate) / (r.unit || 1))
    skuKrw.set(s.id, { name: s.display_name, sku: s.seller_sku, krwCost: krw })
  }
  if (skuKrw.size === 0) return []

  // 최근 30일 라인 (product_id 매핑된 것만)
  const thirtyAgo = new Date()
  thirtyAgo.setDate(thirtyAgo.getDate() - 30)

  const { data: itemRows } = await adb
    .from('b2b_order_items')
    .select('product_id, sale_price_krw, b2b_orders!inner(account_id, deleted_at, created_at)')
    .in('product_id', Array.from(skuKrw.keys()))
    .eq('b2b_orders.account_id', accountId)
    .is('b2b_orders.deleted_at', null)
    .gte('b2b_orders.created_at', thirtyAgo.toISOString())

  type ItemRow = { product_id: string; sale_price_krw: number | string | null }
  const items = (itemRows as ItemRow[] | null) ?? []

  const saleMap = new Map<string, { sum: number; count: number }>()
  for (const it of items) {
    if (!it.product_id) continue
    const sale = Number(it.sale_price_krw)
    if (!Number.isFinite(sale) || sale <= 0) continue
    const cur = saleMap.get(it.product_id) ?? { sum: 0, count: 0 }
    cur.sum += sale
    cur.count++
    saleMap.set(it.product_id, cur)
  }

  const alerts: MarginLossAlert[] = []
  for (const [pid, s] of skuKrw) {
    const sale = saleMap.get(pid)
    if (!sale || sale.count === 0) continue
    const avgSale = Math.round(sale.sum / sale.count)
    const totalCost = s.krwCost + SHIPPING_EST_KRW
    if (totalCost <= avgSale) continue
    alerts.push({
      product_id: pid,
      product_name: s.name,
      seller_sku: s.sku,
      default_unit_price_krw: s.krwCost,
      recent_avg_sale_krw: avgSale,
      recent_order_count: sale.count,
      loss_per_unit_krw: totalCost - avgSale,
    })
  }

  // 손실 큰 순
  return alerts.sort((a, b) => b.loss_per_unit_krw - a.loss_per_unit_krw)
}
