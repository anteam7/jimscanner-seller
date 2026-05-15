import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/auth/server'
import OrderStatusSelector from '@/components/b2b/OrderStatusSelector'

export const metadata: Metadata = {
  title: '주문 상세 | 짐스캐너 B2B',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

type OrderItem = {
  id: string
  display_order: number
  product_name: string
  product_url: string | null
  quantity: number
  currency: string | null
  unit_price_foreign: number | string | null
  total_price_foreign: number | string | null
  total_price_krw: number | string | null
  weight_kg: number | string | null
  tracking_number: string | null
  notes: string | null
}

type OrderDetail = {
  id: string
  order_number: string
  status: string
  order_date: string
  source: string
  forwarder_country: string | null
  forwarder_request_no: string | null
  estimated_cost_krw: number | string | null
  actual_cost_krw: number | string | null
  request_notes: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
  b2b_clients: {
    id: string
    display_name: string
    vip_grade: string
    total_orders: number
    total_revenue_krw: number | string
  } | null
  b2b_order_items: OrderItem[] | null
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:             { label: '접수 대기', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  confirmed:           { label: '주문 확정', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  paid:                { label: '결제 완료', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  forwarder_submitted: { label: '배대지 신청', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  in_transit:          { label: '운송 중', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  arrived_korea:       { label: '국내 도착', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  delivered:           { label: '배송 완료', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed:           { label: '거래 종료', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:           { label: '취소', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  refunded:            { label: '환불', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
}

const SOURCE_LABEL: Record<string, string> = {
  manual: '수동 입력',
  excel_upload: '엑셀 업로드',
  google_form: '구글폼',
  kakao: '카카오',
  webhook: 'Webhook',
  api: 'API',
  migration: '마이그레이션',
}

function formatKRW(value: number | string | null): string {
  if (value == null || value === '') return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('ko-KR').format(n) + '원'
}

function formatForeign(value: number | string | null, currency: string | null): string {
  if (value == null || value === '' || !currency) return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(n)} ${currency}`
}

function formatDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function formatDateTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatWeight(value: number | string | null): string {
  if (value == null || value === '') return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return '—'
  return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 3 }).format(n)} kg`
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
      {meta.label}
    </span>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-2 border-b border-slate-100 last:border-b-0">
      <dt className="w-28 flex-shrink-0 text-xs font-medium text-slate-500">{label}</dt>
      <dd className="flex-1 text-sm text-slate-800 break-words">{children}</dd>
    </div>
  )
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // UUID 형식 빠른 검증
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound()
  }

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

  const { data: order } = (await db
    .from('b2b_orders')
    .select(
      'id, order_number, status, order_date, source, forwarder_country, forwarder_request_no, estimated_cost_krw, actual_cost_krw, request_notes, internal_notes, created_at, updated_at, b2b_clients(id, display_name, vip_grade, total_orders, total_revenue_krw), b2b_order_items(id, display_order, product_name, product_url, quantity, currency, unit_price_foreign, total_price_foreign, total_price_krw, weight_kg, tracking_number, notes)',
    )
    .eq('id', id)
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .maybeSingle()) as { data: OrderDetail | null }

  if (!order) notFound()

  const items = (order.b2b_order_items ?? []).slice().sort((a, b) => a.display_order - b.display_order)
  const sourceLabel = SOURCE_LABEL[order.source] ?? order.source

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* 헤더 */}
      <div className="flex items-start gap-3">
        <Link
          href="/orders"
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors mt-1"
          aria-label="주문 목록으로"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{order.order_number}</h1>
            <StatusBadge status={order.status} />
            <span className="text-[11px] text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{sourceLabel}</span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            주문일 {formatDate(order.order_date)} · 등록 {formatDateTime(order.created_at)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* 좌측 — 상세 정보 */}
        <div className="space-y-6">
          {/* 의뢰자 */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">의뢰자</h2>
            {order.b2b_clients ? (
              <dl>
                <InfoRow label="이름">
                  <span className="font-medium text-slate-900">{order.b2b_clients.display_name}</span>
                  {order.b2b_clients.vip_grade !== 'normal' && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                      {order.b2b_clients.vip_grade}
                    </span>
                  )}
                </InfoRow>
                <InfoRow label="누적 주문">
                  <span className="tabular-nums">{order.b2b_clients.total_orders.toLocaleString('ko-KR')}건</span>
                </InfoRow>
                <InfoRow label="누적 매출">{formatKRW(order.b2b_clients.total_revenue_krw)}</InfoRow>
              </dl>
            ) : (
              <p className="text-sm text-slate-500">미지정 주문 (의뢰자 정보 없음)</p>
            )}
          </section>

          {/* 상품 */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">
                상품 <span className="text-slate-500 font-normal">({items.length}건)</span>
              </h2>
            </div>
            {items.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">등록된 상품이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-left">
                      <th scope="col" className="px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">상품</th>
                      <th scope="col" className="px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right whitespace-nowrap">수량</th>
                      <th scope="col" className="px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right whitespace-nowrap">단가</th>
                      <th scope="col" className="px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right whitespace-nowrap">합계</th>
                      <th scope="col" className="px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap">중량</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it) => (
                      <tr key={it.id} className="align-top">
                        <td className="px-4 py-3 text-slate-800">
                          <p className="font-medium text-slate-900">{it.product_name}</p>
                          {it.product_url && (
                            <a
                              href={it.product_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-1 text-xs text-indigo-700 hover:text-indigo-800 break-all"
                            >
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                              </svg>
                              <span className="truncate max-w-[280px]">{it.product_url}</span>
                            </a>
                          )}
                          {it.tracking_number && (
                            <p className="text-xs text-slate-500 mt-1">
                              운송장: <span className="font-mono">{it.tracking_number}</span>
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 tabular-nums whitespace-nowrap">
                          {it.quantity.toLocaleString('ko-KR')}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 tabular-nums whitespace-nowrap">
                          {formatForeign(it.unit_price_foreign, it.currency)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900 tabular-nums whitespace-nowrap">
                          {formatForeign(it.total_price_foreign, it.currency)}
                          {it.total_price_krw != null && (
                            <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                              {formatKRW(it.total_price_krw)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                          {formatWeight(it.weight_kg)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 요청·내부 메모 */}
          {(order.request_notes || order.internal_notes) && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">메모</h2>
              {order.request_notes && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">의뢰자 요청 사항</p>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                    {order.request_notes}
                  </p>
                </div>
              )}
              {order.internal_notes && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">내부 메모</p>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    {order.internal_notes}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* 우측 — 메타·액션 사이드바 */}
        <aside className="space-y-4">
          {/* 상태 변경 */}
          <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-indigo-500 bg-gradient-to-br from-indigo-50 to-white shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">현재 상태</p>
            <div className="mb-4">
              <StatusBadge status={order.status} />
            </div>
            <OrderStatusSelector orderId={order.id} currentStatus={order.status} />
          </section>

          {/* 금액·배대지 메타 */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">금액·배대지</p>
            <dl className="text-sm">
              <InfoRow label="예상 금액">{formatKRW(order.estimated_cost_krw)}</InfoRow>
              <InfoRow label="실제 금액">{formatKRW(order.actual_cost_krw)}</InfoRow>
              <InfoRow label="배대지 국가">{order.forwarder_country ?? '—'}</InfoRow>
              <InfoRow label="배대지 신청번호">
                {order.forwarder_request_no ? (
                  <span className="font-mono text-xs">{order.forwarder_request_no}</span>
                ) : '—'}
              </InfoRow>
            </dl>
          </section>

          {/* 액션 — 양식 변환은 P1 */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">액션</p>
            <button
              type="button"
              disabled
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-md text-slate-500 bg-slate-100 border border-slate-200 cursor-not-allowed"
              title="P1 작업 — 33 배대지 양식 변환은 준비 중입니다."
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6 3.75 3 3m0 0 3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75" />
              </svg>
              배대지 양식으로 변환
            </button>
            <p className="text-[10px] text-slate-500 text-center">준비 중 — 33 배대지 spec 수집 후 활성</p>
          </section>

          {/* 메타 */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 text-xs text-slate-500 space-y-1.5">
            <div className="flex justify-between gap-2">
              <span>등록일</span>
              <span className="text-slate-700 tabular-nums">{formatDateTime(order.created_at)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>최종 수정</span>
              <span className="text-slate-700 tabular-nums">{formatDateTime(order.updated_at)}</span>
            </div>
            <div className="flex justify-between gap-2 pt-2 border-t border-slate-100">
              <span>주문 ID</span>
              <span className="font-mono text-[10px] text-slate-600 truncate">{order.id}</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
