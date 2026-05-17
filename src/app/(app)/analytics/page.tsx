import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'
import { getExchangeRates } from '@/lib/b2b/exchange-rate'

export const metadata: Metadata = {
  title: '매출·마진 분석',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

type OrderItem = {
  product_id: string | null
  product_name: string
  quantity: number
  currency: string | null
  unit_price_foreign: number | string | null
  sale_price_krw: number | string | null
}

type OrderRow = {
  id: string
  created_at: string
  b2b_order_items: OrderItem[] | null
}

function formatKRW(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('ko-KR').format(Math.round(n)) + '원'
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function AnalyticsPage() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return null

  // 최근 6개월 주문
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const { data: orderRows } = await db
    .from('b2b_orders')
    .select('id, created_at, b2b_order_items(product_id, product_name, quantity, currency, unit_price_foreign, sale_price_krw)')
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: false })

  const orders = (orderRows ?? []) as OrderRow[]

  // 환율 fetch (실패 시 KRW 만 합산)
  let rates: Record<string, { rate: number; unit: number }> = {}
  try {
    const r = await getExchangeRates()
    for (const [k, v] of Object.entries(r.rates)) {
      rates[k] = { rate: v.rate, unit: v.unit }
    }
  } catch {
    rates = {}
  }

  function toKrw(amount: number, currency: string): number | null {
    if (currency === 'KRW') return amount
    const r = rates[currency]
    if (!r) return null
    return (amount * r.rate) / (r.unit || 1)
  }

  // 월별 집계
  type MonthStat = {
    month: string
    orderCount: number
    saleKrw: number
    purchaseKrw: number
    marginKrw: number
    marginKrwKnown: boolean
  }
  const monthMap = new Map<string, MonthStat>()
  for (const o of orders) {
    const mk = monthKey(new Date(o.created_at))
    if (!monthMap.has(mk)) {
      monthMap.set(mk, { month: mk, orderCount: 0, saleKrw: 0, purchaseKrw: 0, marginKrw: 0, marginKrwKnown: false })
    }
    const stat = monthMap.get(mk)!
    stat.orderCount++
    let orderSale = 0
    let orderPurchase = 0
    let purchaseKnown = true
    for (const it of o.b2b_order_items ?? []) {
      const sale = Number(it.sale_price_krw)
      if (Number.isFinite(sale) && sale > 0) orderSale += sale
      const qty = Number(it.quantity) || 0
      const up = Number(it.unit_price_foreign) || 0
      const curr = it.currency ?? 'KRW'
      if (qty > 0 && up > 0) {
        const krw = toKrw(qty * up, curr)
        if (krw == null) {
          purchaseKnown = false
        } else {
          orderPurchase += krw
        }
      }
    }
    stat.saleKrw += orderSale
    stat.purchaseKrw += orderPurchase
    if (orderSale > 0 && purchaseKnown && orderPurchase > 0) {
      stat.marginKrw += orderSale - orderPurchase
      stat.marginKrwKnown = true
    }
  }
  const months = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month))

  // SKU 별 집계 (등록 SKU 만)
  type SkuStat = {
    productId: string
    productName: string
    orderCount: number
    qty: number
    saleKrw: number
    purchaseKrw: number
  }
  const skuMap = new Map<string, SkuStat>()
  for (const o of orders) {
    const counted = new Set<string>()
    for (const it of o.b2b_order_items ?? []) {
      if (!it.product_id) continue
      if (!skuMap.has(it.product_id)) {
        skuMap.set(it.product_id, {
          productId: it.product_id,
          productName: it.product_name,
          orderCount: 0,
          qty: 0,
          saleKrw: 0,
          purchaseKrw: 0,
        })
      }
      const s = skuMap.get(it.product_id)!
      if (!counted.has(it.product_id)) {
        s.orderCount++
        counted.add(it.product_id)
      }
      s.qty += Number(it.quantity) || 0
      const sale = Number(it.sale_price_krw)
      if (Number.isFinite(sale) && sale > 0) s.saleKrw += sale
      const qty = Number(it.quantity) || 0
      const up = Number(it.unit_price_foreign) || 0
      const curr = it.currency ?? 'KRW'
      if (qty > 0 && up > 0) {
        const krw = toKrw(qty * up, curr)
        if (krw != null) s.purchaseKrw += krw
      }
    }
  }
  const skuList = Array.from(skuMap.values())
    .map((s) => ({ ...s, marginKrw: s.saleKrw - s.purchaseKrw }))
    .sort((a, b) => b.marginKrw - a.marginKrw)
    .slice(0, 20)

  // 전체 6개월 합계
  const totalSale = months.reduce((acc, m) => acc + m.saleKrw, 0)
  const totalPurchase = months.reduce((acc, m) => acc + m.purchaseKrw, 0)
  const totalMargin = totalSale - totalPurchase
  const totalOrders = months.reduce((acc, m) => acc + m.orderCount, 0)
  const marginRate = totalSale > 0 ? (totalMargin / totalSale) * 100 : null

  // 차트용 max
  const maxBar = Math.max(
    1,
    ...months.flatMap((m) => [m.saleKrw, m.purchaseKrw, Math.abs(m.marginKrw)]),
  )

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">매출·마진 분석</h1>
          <p className="text-sm text-slate-600 mt-1">
            최근 6개월 주문의 판매가·매입가·마진 (환율 적용). sale_price_krw / unit_price_foreign / currency 입력된 주문만 집계.
          </p>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="총 주문" value={`${totalOrders.toLocaleString('ko-KR')}건`} accent="indigo" />
        <SummaryCard label="총 판매" value={formatKRW(totalSale || null)} accent="emerald" />
        <SummaryCard label="총 매입" value={formatKRW(totalPurchase || null)} accent="sky" />
        <SummaryCard
          label="총 마진"
          value={
            totalSale > 0 || totalPurchase > 0
              ? formatKRW(totalMargin)
              : '—'
          }
          sub={marginRate != null ? `마진율 ${marginRate.toFixed(1)}%` : null}
          accent={totalMargin >= 0 ? 'emerald' : 'rose'}
        />
      </div>

      {/* 월별 차트 */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">월별 추이</h2>
        {months.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">최근 6개월 주문이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider">월</th>
                  <th className="px-3 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right">주문</th>
                  <th className="px-3 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right">판매</th>
                  <th className="px-3 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right">매입</th>
                  <th className="px-3 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right">마진</th>
                  <th className="px-3 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider w-40">시각화</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {months.map((m) => {
                  const salePct = (m.saleKrw / maxBar) * 100
                  const purchasePct = (m.purchaseKrw / maxBar) * 100
                  return (
                    <tr key={m.month}>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-700 font-medium">{m.month}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                        {m.orderCount.toLocaleString('ko-KR')}건
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-700 font-medium">
                        {formatKRW(m.saleKrw || null)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-sky-700">
                        {formatKRW(m.purchaseKrw || null)}
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums font-semibold ${m.marginKrwKnown ? (m.marginKrw >= 0 ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-400'}`}>
                        {m.marginKrwKnown ? formatKRW(m.marginKrw) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="space-y-1">
                          <div className="h-1.5 bg-slate-100 rounded">
                            <div className="h-1.5 bg-emerald-400 rounded" style={{ width: `${salePct}%` }} />
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded">
                            <div className="h-1.5 bg-sky-400 rounded" style={{ width: `${purchasePct}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SKU 별 TOP 20 */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">마진 TOP 20 (등록 SKU)</h2>
          <p className="text-xs text-slate-500 mt-0.5">product_id 가 연결된 주문 라인만 집계. SKU 미등록 라인은 제외.</p>
        </div>
        {skuList.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 mb-2">SKU 가 연결된 주문이 없습니다.</p>
            <Link href="/products" className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 underline underline-offset-2">
              상품 SKU 관리 →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider">상품</th>
                  <th className="px-3 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right">주문</th>
                  <th className="px-3 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right">총 수량</th>
                  <th className="px-3 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right">판매</th>
                  <th className="px-3 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right">매입</th>
                  <th className="px-3 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right">마진</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {skuList.map((s) => (
                  <tr key={s.productId} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2">
                      <Link href={`/products/${s.productId}`} className="text-slate-900 hover:text-indigo-700">
                        {s.productName}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.orderCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.qty}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{formatKRW(s.saleKrw || null)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-sky-700">{formatKRW(s.purchaseKrw || null)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-semibold ${s.marginKrw >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatKRW(s.marginKrw)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string | null
  accent: 'indigo' | 'emerald' | 'sky' | 'rose'
}) {
  const map = {
    indigo: 'from-indigo-50 to-white border-l-indigo-500 text-indigo-700',
    emerald: 'from-emerald-50 to-white border-l-emerald-500 text-emerald-700',
    sky: 'from-sky-50 to-white border-l-sky-500 text-sky-700',
    rose: 'from-rose-50 to-white border-l-rose-500 text-rose-700',
  }
  const cls = map[accent]
  return (
    <div className={`rounded-xl border border-slate-200 border-l-[3px] bg-gradient-to-br ${cls.split(' ').slice(0, 2).join(' ')} p-5 shadow-sm`}>
      <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${cls.split(' ')[2]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}
