import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'
import { MARKETPLACES } from '@/lib/b2b/order-options'
import { formatKRW, formatDateTime } from '@/lib/b2b/format'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '환불 관리 · 짐스캐너 SELLER',
  description: '마켓 구매자 환불 요청을 추적하고 상태를 관리합니다.',
  robots: { index: false, follow: false },
}

const REFUND_STATUS_META: Record<string, { label: string; cls: string }> = {
  requested:  { label: '요청',   cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  approved:   { label: '승인',   cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  denied:     { label: '거절',   cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  processing: { label: '처리중', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  settled:    { label: '정산완료', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:  { label: '취소',   cls: 'bg-rose-50 text-rose-700 border-rose-200' },
}

const REASON_LABEL: Record<string, string> = {
  product_defect: '상품 불량',
  wrong_item: '오배송',
  customer_cancel: '구매자 변심',
  customs_blocked: '통관 보류',
  market_dispute: '마켓 분쟁',
  shipping_delay: '배송 지연',
  other: '기타',
}

const STATUS_FILTERS = [
  { value: '',           label: '전체' },
  { value: 'requested',  label: '요청' },
  { value: 'approved',   label: '승인' },
  { value: 'processing', label: '처리중' },
  { value: 'settled',    label: '정산완료' },
  { value: 'denied',     label: '거절' },
  { value: 'cancelled',  label: '취소' },
]

const MARKETPLACE_LABEL: Record<string, string> = Object.fromEntries(
  MARKETPLACES.map((m) => [m.value, m.label]),
)

type RefundRow = {
  id: string
  order_id: string
  reason: string
  reason_category: string | null
  status: string
  refund_amount_krw: number | string | null
  requested_at: string
  b2b_orders: {
    order_number: string
    market_order_number: string | null
    buyer_name: string | null
    marketplace: string | null
  } | null
}

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; before?: string }>
}) {
  const params = await searchParams
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return <div className="p-8"><p className="text-sm text-slate-600">로그인이 필요합니다.</p></div>
  }

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) {
    return <div className="p-8"><p className="text-sm text-slate-600">사업자 계정이 없습니다.</p></div>
  }

  const PAGE_SIZE = 50
  const statusFilter = params.status ?? ''
  const before = params.before ?? ''
  let query = sb
    .from('b2b_refunds')
    .select(
      'id, order_id, reason, reason_category, status, refund_amount_krw, requested_at, b2b_orders(order_number, market_order_number, buyer_name, marketplace)',
    )
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .order('requested_at', { ascending: false })
    .limit(PAGE_SIZE + 1)

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }
  if (before) {
    query = query.lt('requested_at', before)
  }

  const { data: rowsRaw } = (await query) as { data: RefundRow[] | null }
  const rows = rowsRaw ?? []
  const hasMore = rows.length > PAGE_SIZE
  const pageItems = hasMore ? rows.slice(0, PAGE_SIZE) : rows
  const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.requested_at : null
  // 다음 페이지 링크는 status 필터를 보존하고 cursor 만 교체
  const buildHref = (cursor: string | null): string => {
    const qs = new URLSearchParams()
    if (statusFilter) qs.set('status', statusFilter)
    if (cursor) qs.set('before', cursor)
    const s = qs.toString()
    return s ? `/refunds?${s}` : '/refunds'
  }

  // 상태별 카운트 (필터링 안 된 전체)
  const { data: countsRaw } = await sb
    .from('b2b_refunds')
    .select('status')
    .eq('account_id', account.id)
    .is('deleted_at', null)
  const counts: Record<string, number> = {}
  for (const r of countsRaw ?? []) {
    counts[r.status] = (counts[r.status] ?? 0) + 1
  }
  const totalCount = (countsRaw ?? []).length

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          <span className="bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent">환불 관리</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          마켓 구매자 환불 요청을 추적하고 상태를 관리합니다. 총{' '}
          <span className="font-semibold text-slate-900">{totalCount}건</span>.
        </p>
      </header>

      {/* 필터 칩 */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const isActive = (statusFilter ?? '') === f.value
          const count = f.value === '' ? totalCount : counts[f.value] ?? 0
          return (
            <Link
              key={f.value || 'all'}
              href={f.value ? `/refunds?status=${f.value}` : '/refunds'}
              prefetch={false}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {f.label}
              <span
                className={`tabular-nums text-[10px] ${
                  isActive ? 'text-indigo-100' : 'text-slate-500'
                }`}
              >
                {count}
              </span>
            </Link>
          )
        })}
      </div>

      {/* 목록 */}
      {pageItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">환불 내역이 없습니다.</p>
          <p className="mt-1 text-xs text-slate-500">
            주문 상세 페이지에서 <span className="font-semibold">환불 요청</span> 버튼으로 등록할 수 있습니다.
          </p>
          <Link
            href="/orders"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            주문 목록으로 이동
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left">
                  <th scope="col" className="px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">요청일</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">상태</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">주문</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">사유</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right whitespace-nowrap">환불액</th>
                  <th scope="col" className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map((r) => {
                  const meta = REFUND_STATUS_META[r.status] ?? REFUND_STATUS_META.requested
                  const reasonShort = r.reason.length > 40 ? r.reason.slice(0, 40) + '…' : r.reason
                  const marketLabel = r.b2b_orders?.marketplace
                    ? MARKETPLACE_LABEL[r.b2b_orders.marketplace] ?? r.b2b_orders.marketplace
                    : null
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap tabular-nums">
                        {formatDateTime(r.requested_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        <Link href={`/orders/${r.order_id}`} prefetch={false} className="hover:text-indigo-700 transition-colors">
                          <p className="font-medium text-slate-900">
                            {r.b2b_orders?.market_order_number ?? r.b2b_orders?.order_number ?? '—'}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {marketLabel && <span className="mr-1.5">{marketLabel}</span>}
                            {r.b2b_orders?.buyer_name ?? '—'}
                          </p>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-md">
                        {r.reason_category && (
                          <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 mr-1.5">
                            {REASON_LABEL[r.reason_category] ?? r.reason_category}
                          </span>
                        )}
                        <span className="text-xs">{reasonShort}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 tabular-nums whitespace-nowrap">
                        {formatKRW(r.refund_amount_krw)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          href={`/refunds/${r.id}`}
                          prefetch={false}
                          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-900"
                        >
                          상세
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {(hasMore || before) && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-t border-slate-200">
              {before ? (
                <Link
                  href={buildHref(null)}
                  prefetch={false}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  처음으로
                </Link>
              ) : (
                <span className="text-xs text-slate-400">최신 {PAGE_SIZE}건 표시 중</span>
              )}
              {hasMore && nextCursor ? (
                <Link
                  href={buildHref(nextCursor)}
                  prefetch={false}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  다음 {PAGE_SIZE}건
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ) : (
                <span className="text-xs text-slate-400">마지막 페이지</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
