import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import { MARKETPLACES } from '@/lib/b2b/order-options'
import OrderListClient from '@/components/b2b/OrderListClient'
import type { ForwarderTemplateLite } from '@/components/b2b/ForwarderExportModal'

export const metadata: Metadata = {
  title: '국내 주문 목록',
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
  buyer_phone: string | null
  buyer_postal_code: string | null
  buyer_address: string | null
  buyer_customs_code: string | null
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
  refund_requested:     { label: '환불 신청', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  refunded:             { label: '환불 완료', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  customs_denied:       { label: '통관 거부', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  disputed:             { label: '분쟁 중', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
}

const MARKETPLACE_LABEL: Record<string, string> = Object.fromEntries(
  MARKETPLACES.map((m) => [m.value, m.label]),
)

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '마켓 접수' },
  { value: 'confirmed', label: '매입 발주' },
  { value: 'paid', label: '매입 완료' },
  { value: 'forwarder_submitted', label: '배대지 입고' },
  { value: 'in_transit', label: '운송 중' },
  { value: 'completed', label: '구매 확정' },
  { value: 'cancelled', label: '취소' },
  { value: 'refund_requested', label: '환불 신청' },
  { value: 'refunded', label: '환불 완료' },
  { value: 'customs_denied', label: '통관 거부' },
  { value: 'disputed', label: '분쟁 중' },
]

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
      <div className="mt-5 flex items-center justify-center gap-2">
        <Link
          href="/orders/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 14 14" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 2v10M2 7h10" />
          </svg>
          새 주문 입력
        </Link>
        <Link
          href="/orders/bulk"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-indigo-700 border border-indigo-200 bg-white hover:bg-indigo-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
          일괄 입력
        </Link>
      </div>
    </div>
  )
}

const PAGE_SIZE = 50

export default async function OrdersListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; marketplace?: string; page?: string }>
}) {
  const { status: statusFilter = 'all', q: query = '', marketplace: marketFilter = '', page: pageRaw } = await searchParams
  const page = Math.max(1, Number.parseInt(pageRaw ?? '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: account } = await supabase
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!account) return null

  let qb = supabase
    .from('b2b_orders')
    .select(
      'id, order_number, status, order_date, marketplace, market_order_number, buyer_name, buyer_phone, buyer_postal_code, buyer_address, buyer_customs_code, request_notes, created_at, b2b_order_items(product_name, sale_price_krw)',
      { count: 'exact' },
    )
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

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

  const { data: rows, count: totalCount } = (await qb) as { data: OrderRow[] | null; count: number | null }
  const baseOrders = rows ?? []
  const total = totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // 영수증 매칭 count 일괄 fetch
  const orderIds = baseOrders.map((o) => o.id)
  type ReceiptCountRow = { matched_order_id: string | null }
  const receiptCountByOrder = new Map<string, number>()
  if (orderIds.length > 0) {
    const { data: matchedRows } = await supabase
      .from('b2b_supplier_purchases')
      .select('matched_order_id')
      .eq('account_id', account.id)
      .in('matched_order_id', orderIds)
    for (const r of (matchedRows ?? []) as ReceiptCountRow[]) {
      if (!r.matched_order_id) continue
      receiptCountByOrder.set(r.matched_order_id, (receiptCountByOrder.get(r.matched_order_id) ?? 0) + 1)
    }
  }
  const orders = baseOrders.map((o) => ({ ...o, receipt_count: receiptCountByOrder.get(o.id) ?? 0 }))

  // 합배송 모달용 templates fetch (공유 + 본인)
  const admin = createAdminClient()
  const { data: tplRows } = await admin
    .from('b2b_form_templates')
    .select('id, name, owner_account_id, forwarder_id, combine_rule, forwarders(name)')
    .eq('is_active', true)
    .or(`owner_account_id.is.null,owner_account_id.eq.${account.id}`)
    .order('owner_account_id', { ascending: true, nullsFirst: true })
    .order('name', { ascending: true })

  const templateIds = (tplRows ?? []).map((t) => t.id)
  const { data: colRows } = templateIds.length
    ? await admin
        .from('b2b_form_template_columns')
        .select('template_id, column_index, column_label, source_kind, user_input_label, user_input_options, constant_value, required')
        .in('template_id', templateIds)
        .order('column_index', { ascending: true })
    : { data: [] as Array<Record<string, unknown>> }

  type ColRow = {
    template_id: string
    column_index: number
    column_label: string
    source_kind: string
    user_input_label: string | null
    user_input_options: string[] | null
    constant_value: string | null
    required: boolean
  }
  type TplRow = {
    id: string
    name: string
    owner_account_id: string | null
    forwarder_id: string | null
    combine_rule: string | null
    forwarders: { name: string } | null
  }

  const columnsByTpl = new Map<string, ColRow[]>()
  for (const c of (colRows ?? []) as ColRow[]) {
    const arr = columnsByTpl.get(c.template_id) ?? []
    arr.push(c)
    columnsByTpl.set(c.template_id, arr)
  }

  const templates: ForwarderTemplateLite[] = ((tplRows ?? []) as TplRow[]).map((t) => ({
    id: t.id,
    name: t.name,
    owner_account_id: t.owner_account_id,
    forwarder_id: t.forwarder_id,
    forwarder_name: t.forwarders?.name ?? null,
    combine_rule: t.combine_rule,
    columns: (columnsByTpl.get(t.id) ?? []).map((c) => ({
      column_index: c.column_index,
      column_label: c.column_label,
      source_kind: c.source_kind,
      user_input_label: c.user_input_label,
      user_input_options: c.user_input_options,
      constant_value: c.constant_value,
      required: c.required,
    })),
  }))

  // 필터 링크 헬퍼
  const buildHref = (overrides: Record<string, string | null>) => {
    const sp = new URLSearchParams()
    const status = overrides.status !== undefined ? overrides.status : (statusFilter !== 'all' ? statusFilter : null)
    const mp = overrides.marketplace !== undefined ? overrides.marketplace : (marketFilter || null)
    const qv = overrides.q !== undefined ? overrides.q : (query || null)
    // 필터 변경 시 page 리셋, 명시 override 가 있으면 그 값
    const pg = overrides.page !== undefined ? overrides.page : null
    if (status) sp.set('status', status)
    if (mp) sp.set('marketplace', mp)
    if (qv) sp.set('q', qv)
    if (pg) sp.set('page', pg)
    const s = sp.toString()
    return s ? `/orders?${s}` : '/orders'
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      {/* 헤더 */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">국내 주문 목록</h1>
          <p className="text-sm text-slate-600 mt-1">
            국내 마켓 주문을 등록하고 해외 매입 영수증과 매칭합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/orders/tracking-paste"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
            title="운송장 일괄 입력"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5M5.25 4.5h13.5a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5Z" />
            </svg>
            운송장 일괄
          </Link>
          <Link
            href="/orders/bulk"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold text-indigo-700 border border-indigo-200 bg-white hover:bg-indigo-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            일괄 입력
          </Link>
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
          <OrderListClient
            orders={orders}
            templates={templates}
            marketplaceLabel={MARKETPLACE_LABEL}
            statusMeta={STATUS_META}
          />
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <p>
              전체 {total.toLocaleString('ko-KR')}건 · {offset + 1}–{offset + orders.length} 표시
              {totalPages > 1 ? ` · ${page}/${totalPages}쪽` : ''}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {page > 1 ? (
                  <Link
                    href={buildHref({ page: page > 2 ? String(page - 1) : null })}
                    className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    ← 이전
                  </Link>
                ) : (
                  <span className="px-2.5 py-1 rounded-md border border-slate-100 bg-slate-50 text-slate-300">← 이전</span>
                )}
                {page < totalPages ? (
                  <Link
                    href={buildHref({ page: String(page + 1) })}
                    className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    다음 →
                  </Link>
                ) : (
                  <span className="px-2.5 py-1 rounded-md border border-slate-100 bg-slate-50 text-slate-300">다음 →</span>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
