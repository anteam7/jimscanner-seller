import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'

export const metadata: Metadata = {
  title: '주문 관리 | 짐스캐너 B2B',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

type OrderRow = {
  id: string
  order_number: string
  status: string
  order_date: string
  marketplace: string | null
  market_order_number: string | null
  buyer_name: string | null
  request_notes: string | null
  created_at: string
  b2b_order_items: { product_name: string; sale_price_krw: number | string | null }[] | null
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:              { label: '마켓 주문 접수', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  confirmed:            { label: '매입 발주 완료', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  paid:                 { label: '해외 매입 완료', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  forwarder_submitted:  { label: '배대지 입고', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  in_transit:           { label: '운송 중', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  arrived_korea:        { label: '한국 통관', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  delivered:            { label: '구매자 수령', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed:            { label: '구매 확정', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:            { label: '취소', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  refunded:             { label: '환불', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
}

const MARKETPLACE_LABEL: Record<string, string> = {
  coupang: '쿠팡',
  smartstore: '스마트스토어',
  auction: '옥션',
  gmarket: '지마켓',
  '11st': '11번가',
  interpark: '인터파크',
  wemakeprice: '위메프',
  tmon: '티몬',
  kakao_gift: '카카오선물',
  own_mall: '자사몰',
  kakao_channel: '카카오채널',
  instagram: '인스타그램',
  other: '기타',
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '마켓 접수' },
  { value: 'confirmed', label: '매입 발주' },
  { value: 'paid', label: '매입 완료' },
  { value: 'forwarder_submitted', label: '배대지 입고' },
  { value: 'in_transit', label: '운송 중' },
  { value: 'completed', label: '구매 확정' },
  { value: 'cancelled', label: '취소' },
]

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${meta.cls}`}>
      {meta.label}
    </span>
  )
}

function MarketplaceTag({ value }: { value: string | null }) {
  if (!value) return <span className="text-slate-400 text-xs">—</span>
  return (
    <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 whitespace-nowrap">
      {MARKETPLACE_LABEL[value] ?? value}
    </span>
  )
}

function formatKRW(value: number | string | null): string {
  if (value == null || value === '') return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('ko-KR').format(n) + '원'
}

function formatDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function sumSale(items: { sale_price_krw: number | string | null }[]): number | null {
  let total = 0
  let any = false
  for (const it of items) {
    const v = it.sale_price_krw
    if (v == null || v === '') continue
    const n = typeof v === 'number' ? v : Number(v)
    if (Number.isFinite(n)) {
      total += n
      any = true
    }
  }
  return any ? total : null
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-12 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
        </svg>
      </div>
      <h2 className="text-base font-semibold text-slate-900">아직 등록된 주문이 없습니다</h2>
      <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
        쿠팡·스마트스토어 등 마켓에서 받은 주문을 등록하면 33 배대지 양식으로 자동 변환할 수 있습니다.
      </p>
      <Link
        href="/orders/new"
        className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 14 14" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 2v10M2 7h10" />
        </svg>
        새 주문 입력
      </Link>
    </div>
  )
}

function OrderTable({ orders }: { orders: OrderRow[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left">
              <th scope="col" className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap">마켓</th>
              <th scope="col" className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap">마켓 주문번호</th>
              <th scope="col" className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap">구매자</th>
              <th scope="col" className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">상품</th>
              <th scope="col" className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap">상태</th>
              <th scope="col" className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap text-right">판매가</th>
              <th scope="col" className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap">주문일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((o) => {
              const items = o.b2b_order_items ?? []
              const firstName = items[0]?.product_name ?? '—'
              const extra = items.length > 1 ? ` 외 ${items.length - 1}건` : ''
              const totalSale = sumSale(items)
              const detailHref = `/orders/${o.id}`
              return (
                <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <MarketplaceTag value={o.marketplace} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={detailHref}
                      className="font-mono text-xs font-semibold text-slate-900 hover:text-indigo-700 transition-colors"
                    >
                      {o.market_order_number ?? <span className="text-slate-400 font-sans font-normal">{o.order_number}</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                    {o.buyer_name ?? <span className="text-slate-400">미입력</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-[260px] truncate">
                    {firstName}
                    {extra && <span className="text-slate-400 text-xs ml-1">{extra}</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right font-medium text-slate-700 tabular-nums">
                    {formatKRW(totalSale)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs">
                    {formatDate(o.order_date)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default async function OrdersListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; marketplace?: string }>
}) {
  const { status: statusFilter = 'all', q: query = '', marketplace: marketFilter = '' } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!account) return null

  let qb = db
    .from('b2b_orders')
    .select(
      'id, order_number, status, order_date, marketplace, market_order_number, buyer_name, request_notes, created_at, b2b_order_items(product_name, sale_price_krw)',
    )
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (statusFilter !== 'all' && STATUS_META[statusFilter]) {
    qb = qb.eq('status', statusFilter)
  }
  if (marketFilter && MARKETPLACE_LABEL[marketFilter]) {
    qb = qb.eq('marketplace', marketFilter)
  }
  if (query.trim()) {
    const q = query.trim().replace(/[%,]/g, '')
    qb = qb.or(`order_number.ilike.%${q}%,market_order_number.ilike.%${q}%`)
  }

  const { data: rows } = (await qb) as { data: OrderRow[] | null }
  const orders = rows ?? []

  // 필터 링크 헬퍼
  const buildHref = (overrides: Record<string, string | null>) => {
    const sp = new URLSearchParams()
    const status = overrides.status !== undefined ? overrides.status : (statusFilter !== 'all' ? statusFilter : null)
    const mp = overrides.marketplace !== undefined ? overrides.marketplace : (marketFilter || null)
    const qv = overrides.q !== undefined ? overrides.q : (query || null)
    if (status) sp.set('status', status)
    if (mp) sp.set('marketplace', mp)
    if (qv) sp.set('q', qv)
    const s = sp.toString()
    return s ? `/orders?${s}` : '/orders'
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      {/* 헤더 */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">주문 관리</h1>
          <p className="text-sm text-slate-600 mt-1">
            마켓 주문을 입력하고 33 배대지 양식으로 변환할 수 있습니다.
          </p>
        </div>
        <Link
          href="/orders/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 14 14" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 2v10M2 7h10" />
          </svg>
          새 주문 입력
        </Link>
      </div>

      {/* 필터 + 검색 */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
        {/* 상태 필터 */}
        <div className="flex items-center gap-1 flex-wrap" role="tablist" aria-label="상태 필터">
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.value
            const href = buildHref({ status: f.value === 'all' ? null : f.value })
            return (
              <Link
                key={f.value}
                href={href}
                role="tab"
                aria-selected={isActive}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors
                  ${isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                {f.label}
              </Link>
            )
          })}
        </div>

        {/* 마켓 필터 + 검색 */}
        <form method="get" className="flex items-center gap-2 flex-wrap">
          {statusFilter !== 'all' && <input type="hidden" name="status" value={statusFilter} />}
          <label htmlFor="marketplace_filter" className="text-xs text-slate-500">마켓</label>
          <select
            id="marketplace_filter"
            name="marketplace"
            defaultValue={marketFilter}
            className="px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">전체</option>
            {Object.entries(MARKETPLACE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="q" className="sr-only">주문번호 검색</label>
            <div className="relative">
              <svg className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="셀러/마켓 주문번호"
                className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-48"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold rounded-md text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
            >
              적용
            </button>
          </div>
        </form>
      </div>

      {/* 목록 또는 빈 상태 */}
      {orders.length === 0 ? (
        statusFilter === 'all' && !query && !marketFilter ? (
          <EmptyState />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-10 text-center">
            <p className="text-sm font-medium text-slate-700">조건에 맞는 주문이 없습니다</p>
            <p className="text-xs text-slate-500 mt-1">필터를 바꾸거나 검색어를 다시 시도해 주세요.</p>
            <Link
              href="/orders"
              className="inline-block mt-3 text-xs font-semibold text-indigo-700 hover:text-indigo-800"
            >
              필터 초기화
            </Link>
          </div>
        )
      ) : (
        <>
          <OrderTable orders={orders} />
          <p className="text-xs text-slate-500">
            최근 {orders.length}건 표시 · 페이지네이션은 추후 확장 예정
          </p>
        </>
      )}
    </div>
  )
}
