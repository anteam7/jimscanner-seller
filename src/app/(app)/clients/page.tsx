import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import { MARKETPLACE_LABEL } from '@/lib/b2b/order-options'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '단골 구매자 · 짐스캐너 SELLER',
  description: '같은 마켓에서 2회 이상 주문한 구매자 자동 묶음.',
  robots: { index: false, follow: false },
}

type OrderRow = {
  id: string
  order_date: string
  status: string
  marketplace: string | null
  buyer_name: string | null
  buyer_phone: string | null
  buyer_address: string | null
  b2b_order_items: { sale_price_krw: number | string | null }[] | null
}

type BuyerGroup = {
  key: string
  phone: string
  marketplace: string | null
  buyerName: string
  orderCount: number
  totalSaleKrw: number
  firstOrderDate: string
  lastOrderDate: string
  lastAddress: string | null
  lastStatus: string
  lastOrderId: string
}

function normalizePhone(p: string | null): string | null {
  if (!p) return null
  const digits = p.replace(/\D/g, '')
  return digits.length >= 9 ? digits : null
}

function formatKRW(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`
}

function formatDate(s: string): string {
  return s.slice(0, 10)
}

export default async function ClientsPage() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return (
      <div className="p-8">
        <p className="text-sm text-slate-600">로그인이 필요합니다.</p>
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id, business_name')
    .eq('user_id', user.id)
    .single()
  if (!account) {
    return (
      <div className="p-8">
        <p className="text-sm text-slate-600">사업자 계정이 없습니다.</p>
      </div>
    )
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (admin as any)
    .from('b2b_orders')
    .select(
      'id, order_date, status, marketplace, buyer_name, buyer_phone, buyer_address, b2b_order_items(sale_price_krw)',
    )
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .not('buyer_phone', 'is', null)
    .order('order_date', { ascending: false })
    .limit(2000)

  const orders: OrderRow[] = rows ?? []

  // phone+marketplace 그룹화
  const groups = new Map<string, BuyerGroup>()
  for (const o of orders) {
    const phone = normalizePhone(o.buyer_phone)
    if (!phone) continue
    const key = `${phone}|${o.marketplace ?? '_'}`
    const itemSale = (o.b2b_order_items ?? []).reduce((sum, it) => {
      const v = Number(it.sale_price_krw)
      return Number.isFinite(v) && v > 0 ? sum + v : sum
    }, 0)
    const existing = groups.get(key)
    if (existing) {
      existing.orderCount++
      existing.totalSaleKrw += itemSale
      if (o.order_date < existing.firstOrderDate) existing.firstOrderDate = o.order_date
      // orders 는 desc 정렬이므로 최초 매치가 가장 최근
    } else {
      groups.set(key, {
        key,
        phone,
        marketplace: o.marketplace,
        buyerName: o.buyer_name ?? '이름 미상',
        orderCount: 1,
        totalSaleKrw: itemSale,
        firstOrderDate: o.order_date,
        lastOrderDate: o.order_date,
        lastAddress: o.buyer_address,
        lastStatus: o.status,
        lastOrderId: o.id,
      })
    }
  }

  // 2회 이상만, 주문 횟수 desc → 총 매출 desc
  const repeatBuyers = Array.from(groups.values())
    .filter((g) => g.orderCount >= 2)
    .sort((a, b) => b.orderCount - a.orderCount || b.totalSaleKrw - a.totalSaleKrw)

  const totalOrders = orders.length
  const totalBuyers = groups.size
  const repeatCount = repeatBuyers.length
  const repeatRate = totalBuyers > 0 ? Math.round((repeatCount / totalBuyers) * 100) : 0

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">단골 구매자</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          같은 마켓에서 2회 이상 주문한 구매자를 자동으로 묶어 보여줍니다.
        </p>
      </header>

      {/* 통계 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg bg-white shadow-sm border-l-[3px] border-l-indigo-500 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">최근 주문</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{totalOrders.toLocaleString('ko-KR')}건</p>
          <p className="mt-0.5 text-[11px] text-slate-500">최대 2,000건 분석</p>
        </div>
        <div className="rounded-lg bg-white shadow-sm border-l-[3px] border-l-emerald-500 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">전체 구매자</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{totalBuyers.toLocaleString('ko-KR')}명</p>
          <p className="mt-0.5 text-[11px] text-slate-500">phone × 마켓 기준</p>
        </div>
        <div className="rounded-lg bg-white shadow-sm border-l-[3px] border-l-amber-500 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">단골 구매자</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{repeatCount.toLocaleString('ko-KR')}명</p>
          <p className="mt-0.5 text-[11px] text-amber-700 font-semibold">재구매율 {repeatRate}%</p>
        </div>
      </div>

      {/* 목록 */}
      <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">단골 구매자 목록</h2>
          <p className="text-[11px] text-slate-500">주문 횟수 많은 순</p>
        </div>
        {repeatBuyers.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-slate-600 font-medium">아직 단골 구매자가 없습니다.</p>
            <p className="mt-1 text-xs text-slate-500">
              같은 phone + 마켓에서 2회 이상 주문한 구매자가 자동으로 나타납니다.
            </p>
            <Link
              href="/orders"
              className="mt-4 inline-flex h-8 px-4 items-center text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
            >
              주문 목록 보기
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-2.5 text-left">구매자</th>
                  <th className="px-4 py-2.5 text-left">마켓</th>
                  <th className="px-4 py-2.5 text-right">주문 횟수</th>
                  <th className="px-4 py-2.5 text-right">총 판매가</th>
                  <th className="px-4 py-2.5 text-left">첫 주문</th>
                  <th className="px-4 py-2.5 text-left">최근 주문</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {repeatBuyers.map((b) => (
                  <tr key={b.key} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{b.buyerName}</p>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">{b.phone}</p>
                      {b.lastAddress && (
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[280px]">{b.lastAddress}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded">
                        {MARKETPLACE_LABEL.get(b.marketplace ?? '') ?? (b.marketplace ?? '미지정')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded tabular-nums">
                        {b.orderCount}회
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-semibold text-emerald-700 tabular-nums">{formatKRW(b.totalSaleKrw)}</p>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-600 tabular-nums">{formatDate(b.firstOrderDate)}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-600 tabular-nums">{formatDate(b.lastOrderDate)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/orders/${b.lastOrderId}`}
                        className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 hover:underline underline-offset-2"
                      >
                        최근 주문 →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400">
        ※ phone 번호의 숫자만 비교합니다. 마켓이 다르면 같은 구매자라도 별도 단골로 집계됩니다.
        분석 범위는 최근 2,000건이며 더 긴 기간은 향후 페이징으로 확장 예정입니다.
      </p>
    </div>
  )
}
