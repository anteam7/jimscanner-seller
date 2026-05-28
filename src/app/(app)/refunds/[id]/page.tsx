import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/auth/server'
import RefundActions from './RefundActions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '환불 상세',
  robots: { index: false },
}

const REFUND_STATUS_META: Record<string, { label: string; cls: string }> = {
  requested:  { label: '요청',     cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  approved:   { label: '승인',     cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  denied:     { label: '거절',     cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  processing: { label: '처리중',   cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  settled:    { label: '정산완료', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:  { label: '취소',     cls: 'bg-rose-50 text-rose-700 border-rose-200' },
}

const REASON_LABEL: Record<string, string> = {
  product_defect:  '상품 불량',
  wrong_item:      '오배송',
  customer_cancel: '구매자 변심',
  customs_blocked: '통관 보류',
  market_dispute:  '마켓 분쟁',
  shipping_delay:  '배송 지연',
  other:           '기타',
}

const METHOD_LABEL: Record<string, string> = {
  card:          '카드 취소',
  bank_transfer: '계좌 이체',
  point:         '포인트',
  partial:       '부분 환불',
}

type StatusHistoryEntry = {
  at: string
  from: string | null
  to: string
  by: string | null
}

type OrderItemInfo = {
  id: string
  product_name: string
  quantity: number
  sale_price_krw: number | string | null
}

type RefundDetail = {
  id: string
  account_id: string
  order_id: string
  order_item_id: string | null
  reason: string
  reason_category: string | null
  status: string
  status_history: StatusHistoryEntry[] | unknown
  refund_amount_krw: number | string | null
  refund_method: string | null
  buyer_message: string | null
  internal_notes: string | null
  requested_at: string
  approved_at: string | null
  settled_at: string | null
  created_at: string
  updated_at: string
  b2b_orders: {
    id: string
    order_number: string
    market_order_number: string | null
    buyer_name: string | null
    marketplace: string | null
    status: string
  } | null
  b2b_order_items: OrderItemInfo | null
}

function formatKRW(v: number | string | null): string {
  if (v == null || v === '') return '—'
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('ko-KR').format(n) + '원'
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function RefundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound()
  }

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return null

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return null

  const { data: refund } = (await sb
    .from('b2b_refunds')
    .select(
      'id, account_id, order_id, order_item_id, reason, reason_category, status, status_history, refund_amount_krw, refund_method, buyer_message, internal_notes, requested_at, approved_at, settled_at, created_at, updated_at, b2b_orders(id, order_number, market_order_number, buyer_name, marketplace, status), b2b_order_items(id, product_name, quantity, sale_price_krw)',
    )
    .eq('id', id)
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .maybeSingle()) as { data: RefundDetail | null }

  if (!refund) notFound()

  const meta = REFUND_STATUS_META[refund.status] ?? REFUND_STATUS_META.requested
  const order = refund.b2b_orders
  const history: StatusHistoryEntry[] = Array.isArray(refund.status_history)
    ? (refund.status_history as StatusHistoryEntry[])
    : []

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <div className="flex items-start gap-3">
          <Link
            href="/refunds"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors mt-1"
            aria-label="환불 목록으로"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">환불 #{refund.id.slice(0, 8)}</h1>
              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
                {meta.label}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              요청 {formatDateTime(refund.requested_at)} · 최종 수정 {formatDateTime(refund.updated_at)}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* 좌측 본문 */}
        <div className="space-y-6">
          {/* 주문 정보 */}
          {order && (
            <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-emerald-500 bg-white shadow-sm p-6 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">관련 주문</h2>
              <dl className="text-sm space-y-2">
                <div className="flex items-start gap-4">
                  <dt className="w-24 flex-shrink-0 text-xs font-medium text-slate-500">주문번호</dt>
                  <dd className="flex-1">
                    <Link href={`/orders/${order.id}`} className="text-indigo-700 hover:text-indigo-900 hover:underline font-mono text-xs">
                      {order.market_order_number ?? order.order_number}
                    </Link>
                  </dd>
                </div>
                <div className="flex items-start gap-4">
                  <dt className="w-24 flex-shrink-0 text-xs font-medium text-slate-500">구매자</dt>
                  <dd className="flex-1 text-slate-800">{order.buyer_name ?? '—'}</dd>
                </div>
                <div className="flex items-start gap-4">
                  <dt className="w-24 flex-shrink-0 text-xs font-medium text-slate-500">주문 상태</dt>
                  <dd className="flex-1 text-slate-800 text-xs">{order.status}</dd>
                </div>
                {refund.b2b_order_items && (
                  <div className="flex items-start gap-4 pt-2 border-t border-slate-100">
                    <dt className="w-24 flex-shrink-0 text-xs font-medium text-slate-500">라인 단위</dt>
                    <dd className="flex-1 text-sm text-slate-800">
                      {refund.b2b_order_items.product_name} ×{refund.b2b_order_items.quantity}
                      {refund.b2b_order_items.sale_price_krw != null && (
                        <span className="ml-2 text-xs text-slate-500">
                          판매가 {formatKRW(refund.b2b_order_items.sale_price_krw)}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* 환불 정보 */}
          <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-rose-500 bg-white shadow-sm p-6 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">환불 사유 · 금액</h2>
            <dl className="text-sm space-y-2.5">
              <div className="flex items-start gap-4">
                <dt className="w-24 flex-shrink-0 text-xs font-medium text-slate-500">사유 분류</dt>
                <dd className="flex-1">
                  {refund.reason_category ? (
                    <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {REASON_LABEL[refund.reason_category] ?? refund.reason_category}
                    </span>
                  ) : (
                    <span className="text-slate-400">미분류</span>
                  )}
                </dd>
              </div>
              <div className="flex items-start gap-4">
                <dt className="w-24 flex-shrink-0 text-xs font-medium text-slate-500">사유 본문</dt>
                <dd className="flex-1 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{refund.reason}</dd>
              </div>
              <div className="flex items-start gap-4">
                <dt className="w-24 flex-shrink-0 text-xs font-medium text-slate-500">환불 금액</dt>
                <dd className="flex-1 text-sm font-semibold text-rose-700 tabular-nums">{formatKRW(refund.refund_amount_krw)}</dd>
              </div>
              <div className="flex items-start gap-4">
                <dt className="w-24 flex-shrink-0 text-xs font-medium text-slate-500">환불 방법</dt>
                <dd className="flex-1 text-sm text-slate-800">
                  {refund.refund_method
                    ? METHOD_LABEL[refund.refund_method] ?? refund.refund_method
                    : <span className="text-slate-400">미지정</span>}
                </dd>
              </div>
              {refund.buyer_message && (
                <div className="pt-2 border-t border-slate-100">
                  <dt className="text-xs font-medium text-slate-500 mb-1.5">구매자 메시지</dt>
                  <dd className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                    {refund.buyer_message}
                  </dd>
                </div>
              )}
              {refund.internal_notes && (
                <div className="pt-2 border-t border-slate-100">
                  <dt className="text-xs font-medium text-slate-500 mb-1.5">내부 메모</dt>
                  <dd className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    {refund.internal_notes}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {/* 상태 이력 */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">상태 이력 ({history.length}건)</h2>
            {history.length === 0 ? (
              <p className="text-sm text-slate-500">이력 없음.</p>
            ) : (
              <ol className="space-y-2">
                {history.slice().reverse().map((h, idx) => {
                  const toMeta = REFUND_STATUS_META[h.to] ?? REFUND_STATUS_META.requested
                  const fromMeta = h.from ? REFUND_STATUS_META[h.from] : null
                  return (
                    <li key={idx} className="flex items-start gap-3 text-sm">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300 mt-2" />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {fromMeta && (
                            <>
                              <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${fromMeta.cls}`}>
                                {fromMeta.label}
                              </span>
                              <span className="text-slate-400">→</span>
                            </>
                          )}
                          <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${toMeta.cls}`}>
                            {toMeta.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {formatDateTime(h.at)}
                          {h.by && <span className="ml-2 text-slate-400">· {h.by}</span>}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        </div>

        {/* 우측 사이드바 — 액션 */}
        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-indigo-500 bg-gradient-to-br from-indigo-50 to-white shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">현재 상태</p>
            <div className="mb-4">
              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
                {meta.label}
              </span>
            </div>
            <RefundActions refundId={refund.id} currentStatus={refund.status} />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 text-xs text-slate-500 space-y-1.5">
            <div className="flex justify-between gap-2">
              <span>요청일</span>
              <span className="text-slate-700 tabular-nums">{formatDateTime(refund.requested_at)}</span>
            </div>
            {refund.approved_at && (
              <div className="flex justify-between gap-2">
                <span>승인일</span>
                <span className="text-slate-700 tabular-nums">{formatDateTime(refund.approved_at)}</span>
              </div>
            )}
            {refund.settled_at && (
              <div className="flex justify-between gap-2">
                <span>정산일</span>
                <span className="text-slate-700 tabular-nums">{formatDateTime(refund.settled_at)}</span>
              </div>
            )}
            <div className="flex justify-between gap-2 pt-2 border-t border-slate-100">
              <span>환불 ID</span>
              <span className="font-mono text-[10px] text-slate-600 truncate">{refund.id}</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
