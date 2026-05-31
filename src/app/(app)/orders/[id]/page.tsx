import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import OrderStatusSelector from '@/components/b2b/OrderStatusSelector'
import ForwarderExportButton from '@/components/b2b/ForwarderExportButton'
import { TrackingEditor } from '@/components/b2b/TrackingEditor'
import { LinePaymentCardSelector } from '@/components/b2b/LinePaymentCardSelector'
import { CustomsGuidePanel } from '@/components/b2b/CustomsGuidePanel'
import type { ForwarderTemplateLite } from '@/components/b2b/ForwarderExportModal'
import { MARKETPLACES, SUPPLIER_SITES } from '@/lib/b2b/order-options'
import { getCustomsGuide } from '@/lib/b2b/customs-guide'
import { getExchangeRates, type ExchangeRateSnapshot } from '@/lib/b2b/exchange-rate'

export const metadata: Metadata = {
  title: '주문 상세',
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
  tracking_number_overseas: string | null
  carrier: string | null
  image_url: string | null
  notes: string | null
  supplier_site: string | null
  supplier_order_number: string | null
  supplier_purchased_at: string | null
  sale_price_krw: number | string | null
  market_product_id: string | null
  market_option: string | null
  product_id: string | null
  customs_category: string | null
  payment_card_id: string | null
  b2b_payment_cards: { alias: string; last4: string | null } | null
}

type OrderDetail = {
  id: string
  order_number: string
  status: string
  order_date: string
  source: string
  // 마켓
  marketplace: string | null
  market_order_number: string | null
  market_commission_krw: number | string | null
  shipping_fee_krw: number | string | null
  // 마켓 구매자
  buyer_name: string | null
  buyer_phone: string | null
  buyer_postal_code: string | null
  buyer_address: string | null
  buyer_detail_address: string | null
  buyer_customs_code: string | null
  // 배대지
  forwarder_id: string | null
  forwarder_country: string | null
  forwarder_request_no: string | null
  forwarders: { name: string; slug: string } | null
  // 비용
  estimated_cost_krw: number | string | null
  actual_cost_krw: number | string | null
  exchange_rate_applied: ExchangeRateSnapshot | null
  // 메모
  request_notes: string | null
  internal_notes: string | null
  // 메타
  created_at: string
  updated_at: string
  b2b_order_items: OrderItem[] | null
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:             { label: '마켓 주문 접수', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  confirmed:           { label: '매입 발주 완료', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  paid:                { label: '해외 매입 완료', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  forwarder_submitted: { label: '배대지 입고', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  in_transit:          { label: '한국행 운송 중', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  arrived_korea:       { label: '한국 통관', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  delivered:           { label: '구매자 수령', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed:           { label: '구매 확정', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:           { label: '취소', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  refund_requested:    { label: '환불 요청', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  refunded:            { label: '환불', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
}

const MARKETPLACE_LABEL: Record<string, string> = Object.fromEntries(
  MARKETPLACES.map((m) => [m.value, m.label]),
)

const SUPPLIER_LABEL: Record<string, string> = Object.fromEntries(
  SUPPLIER_SITES.map((s) => [s.value, s.label]),
)

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

function sumSale(items: OrderItem[]): number | null {
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

// 라인 매입가(해외 통화)를 환율 맵으로 KRW 환산. estimated_cost_krw 가 비어 있을 때
// 마진율 경고에 쓸 매입 원가를 추정한다. KRW 라인은 그대로, 환율 없는 통화는 제외.
function convertItemsToKrw(
  items: OrderItem[],
  rates: Record<string, { rate: number; unit: number }>,
): number | null {
  let total = 0
  let any = false
  for (const it of items) {
    const cur = it.currency
    if (!cur) continue
    const totalForeign =
      it.total_price_foreign != null && it.total_price_foreign !== ''
        ? Number(it.total_price_foreign)
        : Number(it.unit_price_foreign ?? 0) * Number(it.quantity ?? 1)
    if (!Number.isFinite(totalForeign) || totalForeign <= 0) continue
    if (cur === 'KRW') {
      total += totalForeign
      any = true
      continue
    }
    const r = rates[cur]
    if (!r || !r.rate || !Number.isFinite(r.rate)) continue
    total += totalForeign * (r.rate / (r.unit || 1))
    any = true
  }
  return any ? Math.round(total) : null
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

function CustomsBadge({ category }: { category: string | null }) {
  const guide = getCustomsGuide(category)
  if (!guide) return null
  return (
    <span className="inline-flex flex-wrap items-center gap-1 mt-1.5">
      <span className="inline-flex items-center rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
        {guide.emoji} {guide.label}
      </span>
      {guide.list_limit_usd != null && (
        <span className="inline-flex items-center rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
          목록통관 ${guide.list_limit_usd}
        </span>
      )}
      {guide.agency && (
        <span className="inline-flex items-center rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
          {guide.agency} 신고
        </span>
      )}
    </span>
  )
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound()
  }

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

  const { data: order } = (await supabase
    .from('b2b_orders')
    .select(
      'id, order_number, status, order_date, source, marketplace, market_order_number, market_commission_krw, shipping_fee_krw, buyer_name, buyer_phone, buyer_postal_code, buyer_address, buyer_detail_address, buyer_customs_code, forwarder_id, forwarder_country, forwarder_request_no, estimated_cost_krw, actual_cost_krw, exchange_rate_applied, request_notes, internal_notes, created_at, updated_at, forwarders(name, slug), b2b_order_items(id, display_order, product_name, product_url, quantity, currency, unit_price_foreign, total_price_foreign, total_price_krw, weight_kg, tracking_number, tracking_number_overseas, carrier, image_url, notes, supplier_site, supplier_order_number, supplier_purchased_at, sale_price_krw, market_product_id, market_option, product_id, customs_category, payment_card_id, b2b_payment_cards(alias, last4))',
    )
    .eq('id', id)
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .maybeSingle()) as { data: OrderDetail | null }

  if (!order) notFound()

  // 매칭된 영수증 fetch (F5 역방향)
  type MatchedReceiptRow = {
    id: string
    amount_share_foreign: number | string | null
    matched_at: string
    b2b_supplier_purchases: {
      id: string
      source: string
      supplier_order_number: string
      currency: string | null
      total_foreign: number | string | null
      purchased_at: string | null
      items: unknown
    } | null
  }
  const { data: matchedReceiptsRaw } = (await supabase
    .from('b2b_supplier_purchase_matches')
    .select('id, amount_share_foreign, matched_at, b2b_supplier_purchases(id, source, supplier_order_number, currency, total_foreign, purchased_at, items)')
    .eq('order_id', id)
    .eq('account_id', account.id)
    .order('matched_at', { ascending: false })) as { data: MatchedReceiptRow[] | null }
  const matchedReceipts = matchedReceiptsRaw ?? []

  // 가격 변동 감지: 첫 매칭된 영수증의 items 합 vs 라인 합계 비교
  type ReceiptItem = { unit_price?: number | null; qty?: number | null }
  let priceVariancePct: number | null = null
  if (matchedReceipts.length > 0 && order.b2b_order_items && order.b2b_order_items.length > 0) {
    const firstReceipt = matchedReceipts[0].b2b_supplier_purchases
    if (firstReceipt && Array.isArray(firstReceipt.items)) {
      const receiptItems = firstReceipt.items as ReceiptItem[]
      const receiptTotal = receiptItems.reduce(
        (s, it) => s + (Number(it.unit_price ?? 0) * Number(it.qty ?? 1)),
        0,
      )
      const lineTotal = order.b2b_order_items.reduce(
        (s, it) => s + (Number(it.unit_price_foreign ?? 0) * Number(it.quantity ?? 1)),
        0,
      )
      if (receiptTotal > 0 && lineTotal > 0) {
        priceVariancePct = Math.abs(receiptTotal - lineTotal) / lineTotal
      }
    }
  }

  // 사용 가능한 양식 (공유 + 본인 소유) — admin client 로 공유 SELECT 보장
  const admin = createAdminClient()
  const { data: tplRows } = await admin
    .from('b2b_form_templates')
    .select('id, name, owner_account_id, forwarder_id, combine_rule, is_active, forwarders(name)')
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
    is_active: boolean
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

  // 주문의 forwarder_id 와 일치하는 템플릿 default
  const defaultTemplateId =
    templates.find((t) => order.forwarder_id && t.forwarder_id === order.forwarder_id)?.id ??
    templates[0]?.id ??
    null

  const items = (order.b2b_order_items ?? []).slice().sort((a, b) => a.display_order - b.display_order)
  const sourceLabel = SOURCE_LABEL[order.source] ?? order.source
  const marketLabel = order.marketplace ? (MARKETPLACE_LABEL[order.marketplace] ?? order.marketplace) : null
  const totalSale = sumSale(items)
  const fullAddress = [order.buyer_address, order.buyer_detail_address].filter(Boolean).join(' ')

  // 마진율 경고용 매입 원가(KRW) 산정. 우선순위:
  //  1) estimated_cost_krw (셀러가 직접 입력) — 가장 신뢰
  //  2) 주문 생성 시점 환율 스냅샷(exchange_rate_applied)으로 라인 해외가 환산 — '매입 당시 환율'
  //  3) 스냅샷이 없는 과거 주문은 현재 환율로 추정 — '현재 환율(추정)'
  const estimatedCost =
    order.estimated_cost_krw == null ? null : Number(order.estimated_cost_krw)
  let purchaseKrw: number | null =
    estimatedCost != null && Number.isFinite(estimatedCost) && estimatedCost > 0
      ? estimatedCost
      : null
  let purchaseBasis: 'estimated' | 'snapshot' | 'live' | null =
    purchaseKrw != null ? 'estimated' : null
  let rateAsOf: string | null = null

  if (purchaseBasis == null && items.length > 0) {
    const snapRates = order.exchange_rate_applied?.rates ?? null
    if (snapRates) {
      const krw = convertItemsToKrw(items, snapRates)
      if (krw != null) {
        purchaseKrw = krw
        purchaseBasis = 'snapshot'
        rateAsOf = order.exchange_rate_applied?.fetchedAt ?? null
      }
    }
    if (purchaseBasis == null) {
      try {
        const live = await getExchangeRates()
        const liveRates = Object.fromEntries(
          Object.entries(live.rates).map(([k, v]) => [k, { rate: v.rate, unit: v.unit }]),
        )
        const krw = convertItemsToKrw(items, liveRates)
        if (krw != null) {
          purchaseKrw = krw
          purchaseBasis = 'live'
          rateAsOf = live.fetchedAt
        }
      } catch {
        // 환율 조회 실패 시 매입 원가 추정 생략 (마진 경고 미표시)
      }
    }
  }

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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {order.market_order_number ?? order.order_number}
            </h1>
            <StatusBadge status={order.status} />
            {marketLabel && (
              <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                {marketLabel}
              </span>
            )}
            <span className="text-[11px] text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{sourceLabel}</span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            {order.market_order_number && (
              <>
                셀러 번호 <span className="font-mono text-slate-700">{order.order_number}</span> ·{' '}
              </>
            )}
            주문일 {formatDate(order.order_date)} · 등록 {formatDateTime(order.created_at)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* 좌측 */}
        <div className="space-y-6">
          {/* 마켓 + 구매자 */}
          <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-emerald-500 bg-gradient-to-br from-emerald-50/30 to-white shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">마켓 주문 + 배송 수신자</h2>
              <span className="text-[10px] text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                배대지 양식의 수신자
              </span>
            </div>
            <dl>
              <InfoRow label="판매 마켓">
                {marketLabel ? (
                  <span className="font-medium text-slate-900">{marketLabel}</span>
                ) : (
                  <span className="text-slate-400">미지정</span>
                )}
              </InfoRow>
              <InfoRow label="마켓 주문번호">
                {order.market_order_number ? (
                  <span className="font-mono text-xs">{order.market_order_number}</span>
                ) : (
                  <span className="text-slate-400">미입력</span>
                )}
              </InfoRow>
              <InfoRow label="구매자 이름">
                {order.buyer_name ?? <span className="text-slate-400">미입력</span>}
              </InfoRow>
              <InfoRow label="전화">
                {order.buyer_phone ?? <span className="text-slate-400">미입력</span>}
              </InfoRow>
              <InfoRow label="배송 주소">
                {fullAddress ? (
                  <span>
                    {order.buyer_postal_code && (
                      <span className="font-mono text-xs text-slate-500 mr-2">[{order.buyer_postal_code}]</span>
                    )}
                    {fullAddress}
                  </span>
                ) : (
                  <span className="text-slate-400">미입력</span>
                )}
              </InfoRow>
              <InfoRow label="개인통관코드">
                {order.buyer_customs_code ? (
                  <span className="font-mono text-xs">{order.buyer_customs_code}</span>
                ) : (
                  <span className="text-slate-400">미입력</span>
                )}
              </InfoRow>
              {(order.market_commission_krw != null || order.shipping_fee_krw != null) && (
                <>
                  <InfoRow label="마켓 수수료">{formatKRW(order.market_commission_krw)}</InfoRow>
                  <InfoRow label="배송비">{formatKRW(order.shipping_fee_krw)}</InfoRow>
                </>
              )}
            </dl>
          </section>

          {/* 해외 매입 (라인 아이템) */}
          <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-sky-500 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  해외 매입 <span className="text-slate-500 font-normal">({items.length}건)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">어디서 매입했는지 · 매입가 · 판매가</p>
              </div>
            </div>
            {items.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">등록된 상품이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-left">
                      <th scope="col" className="px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">상품 / 매입처</th>
                      <th scope="col" className="px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right whitespace-nowrap">수량</th>
                      <th scope="col" className="px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right whitespace-nowrap">매입가</th>
                      <th scope="col" className="px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right whitespace-nowrap">판매가</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it) => {
                      const supplierLabel = it.supplier_site ? (SUPPLIER_LABEL[it.supplier_site] ?? it.supplier_site) : null
                      return (
                        <tr key={it.id} className="align-top">
                          <td className="px-4 py-3 text-slate-800">
                            <p className="font-medium text-slate-900">{it.product_name}</p>
                            {it.market_option && (
                              <p className="text-xs text-slate-500 mt-0.5">옵션: {it.market_option}</p>
                            )}
                            {(supplierLabel || it.supplier_order_number) && (
                              <p className="text-xs text-slate-600 mt-1.5">
                                {supplierLabel && (
                                  <span className="inline-flex items-center rounded bg-sky-50 border border-sky-200 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 mr-1.5">
                                    {supplierLabel}
                                  </span>
                                )}
                                {it.supplier_order_number && (
                                  <span className="font-mono text-[11px]">{it.supplier_order_number}</span>
                                )}
                              </p>
                            )}
                            <CustomsBadge category={it.customs_category} />
                            {it.product_url && (
                              <a
                                href={it.product_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-1.5 text-xs text-indigo-700 hover:text-indigo-800 break-all"
                              >
                                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                </svg>
                                <span className="truncate max-w-[280px]">{it.product_url}</span>
                              </a>
                            )}
                            {it.tracking_number_overseas && (
                              <p className="text-xs text-slate-500 mt-1">
                                현지 트래킹: <span className="font-mono">{it.tracking_number_overseas}</span>
                                <a
                                  href={`https://www.17track.net/en/track?nums=${encodeURIComponent(it.tracking_number_overseas)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 text-[11px] text-indigo-700 hover:underline font-semibold"
                                  title="17track 외부 사이트에서 트래킹"
                                >
                                  🔎 17track →
                                </a>
                              </p>
                            )}
                            {(it.tracking_number || it.carrier) && (
                              <p className="text-xs text-slate-500 mt-1">
                                국내 배송:{' '}
                                {it.carrier && <span className="text-slate-700">{it.carrier}</span>}
                                {it.carrier && it.tracking_number && <span className="text-slate-400"> · </span>}
                                {it.tracking_number && <span className="font-mono">{it.tracking_number}</span>}
                              </p>
                            )}
                            <TrackingEditor
                              orderId={order.id}
                              itemId={it.id}
                              initialTrackingNumber={it.tracking_number}
                              initialTrackingNumberOverseas={it.tracking_number_overseas}
                              initialCarrier={it.carrier}
                            />
                            <LinePaymentCardSelector
                              orderId={order.id}
                              itemId={it.id}
                              initialCardId={it.payment_card_id}
                              initialCardLabel={
                                it.b2b_payment_cards
                                  ? `${it.b2b_payment_cards.alias}${it.b2b_payment_cards.last4 ? ` ···· ${it.b2b_payment_cards.last4}` : ''}`
                                  : null
                              }
                            />
                            {it.image_url && (
                              <p className="text-xs text-slate-500 mt-1 truncate">
                                이미지:{' '}
                                <a href={it.image_url} target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:text-indigo-800 underline underline-offset-2">
                                  링크
                                </a>
                              </p>
                            )}
                            {it.weight_kg && (
                              <p className="text-xs text-slate-500 mt-1">중량: {formatWeight(it.weight_kg)}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 tabular-nums whitespace-nowrap">
                            {it.quantity.toLocaleString('ko-KR')}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 tabular-nums whitespace-nowrap">
                            <p className="font-medium text-slate-900">{formatForeign(it.total_price_foreign, it.currency)}</p>
                            {it.unit_price_foreign != null && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                단가 {formatForeign(it.unit_price_foreign, it.currency)}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <p className="font-semibold text-emerald-700 tabular-nums">{formatKRW(it.sale_price_krw)}</p>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {totalSale != null && (
              <div className="px-6 py-3 bg-emerald-50/50 border-t border-emerald-100 flex items-center justify-end gap-2 text-xs">
                <span className="text-slate-600">총 판매가</span>
                <span className="font-semibold text-emerald-700 tabular-nums">{formatKRW(totalSale)}</span>
              </div>
            )}
          </section>

          {/* 메모 */}
          {(order.request_notes || order.internal_notes) && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">메모</h2>
              {order.request_notes && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">구매자 요청 / 옵션</p>
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

        {/* 우측 사이드바 */}
        <aside className="space-y-4">
          {/* 상태 변경 */}
          <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-indigo-500 bg-gradient-to-br from-indigo-50 to-white shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">현재 상태</p>
            <div className="mb-4">
              <StatusBadge status={order.status} />
            </div>
            <OrderStatusSelector orderId={order.id} currentStatus={order.status} />
          </section>

          {/* 매칭된 영수증 (F5 역방향) */}
          {matchedReceipts.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                📦 매칭된 해외 영수증 ({matchedReceipts.length}건)
              </p>
              {priceVariancePct !== null && priceVariancePct >= 0.05 && (
                <div className="mb-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-900">
                  ⚠️ 영수증 합계 vs 등록 단가 <b>{(priceVariancePct * 100).toFixed(1)}%</b> 차이.
                  매입가 수정 필요할 수 있습니다 (할인·환율·세금 차이).
                </div>
              )}
              <ul className="space-y-2">
                {matchedReceipts.map((m) => {
                  const r = m.b2b_supplier_purchases
                  if (!r) return null
                  const sourceLabel = r.source === 'amazon_us' ? '아마존 US' :
                    r.source === 'amazon_jp' ? '아마존 JP' :
                    r.source === 'rakuten' ? '라쿠텐' :
                    r.source === 'yahoo' ? '야후' :
                    r.source
                  return (
                    <li key={m.id} className="border border-slate-100 rounded-md p-2 hover:bg-slate-50/60">
                      <Link href={`/imports/${r.id}`} className="block">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded">
                            {sourceLabel}
                          </span>
                          <span className="font-mono text-[11px] text-slate-700">{r.supplier_order_number}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 tabular-nums">
                          {r.currency && r.total_foreign != null && <>총 {r.total_foreign} {r.currency} · </>}
                          {m.amount_share_foreign != null && <>분할 {m.amount_share_foreign} {r.currency} · </>}
                          {r.purchased_at && new Date(r.purchased_at).toLocaleDateString('ko-KR')}
                        </p>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {/* 배대지 */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">배대지</p>
            <dl className="text-sm">
              <InfoRow label="배대지">
                {order.forwarders?.name ? (
                  <span className="font-medium text-slate-900">{order.forwarders.name}</span>
                ) : (
                  <span className="text-slate-400">선택 안 됨</span>
                )}
              </InfoRow>
              <InfoRow label="국가">{order.forwarder_country ?? '—'}</InfoRow>
              <InfoRow label="신청번호">
                {order.forwarder_request_no ? (
                  <span className="font-mono text-xs">{order.forwarder_request_no}</span>
                ) : '—'}
              </InfoRow>
            </dl>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <CustomsGuidePanel />
            </div>
          </section>

          {/* 액션 (양식 변환) */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">액션</p>
            {/* 양식 변환 사전 readiness — 모달 detectMissing 과 동일 5필드 */}
            {(() => {
              const fields = [
                { v: order.buyer_name, label: '수취인명' },
                { v: order.buyer_phone, label: '전화' },
                { v: order.buyer_postal_code, label: '우편번호' },
                { v: order.buyer_address, label: '주소' },
                { v: order.buyer_customs_code, label: '통관코드' },
              ]
              const missing = fields.filter((f) => !f.v?.trim()).map((f) => f.label)
              const ready = fields.length - missing.length
              return missing.length === 0 ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
                  ✓ 양식 필드 5/5 완료 — 바로 변환할 수 있습니다.
                </div>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                  양식 필드 {ready}/5 · 누락: <span className="font-semibold">{missing.join(' · ')}</span>
                  {' '}— 채우면 깔끔하게 변환됩니다. 빈 값으로도 변환되나 배대지에서 거부될 수 있습니다.
                </div>
              )
            })()}
            <ForwarderExportButton
              orderId={order.id}
              templates={templates}
              defaultTemplateId={defaultTemplateId}
              buyerInfo={{
                buyer_name: order.buyer_name,
                buyer_phone: order.buyer_phone,
                buyer_postal_code: order.buyer_postal_code,
                buyer_address: order.buyer_address,
                buyer_customs_code: order.buyer_customs_code,
              }}
            />
            <Link
              href={`/orders/new?duplicate=${order.id}`}
              prefetch={false}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m2.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-7.5A2.25 2.25 0 0 1 10.5 8.25Z" />
              </svg>
              이 주문 복제 (재주문)
            </Link>
            <Link
              href={`/refunds/new?order_id=${order.id}`}
              prefetch={false}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
              환불 요청 등록
            </Link>
          </section>

          {/* 비용 메타 */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">비용</p>
            <dl className="text-sm">
              <InfoRow label="예상 매입 KRW">{formatKRW(order.estimated_cost_krw)}</InfoRow>
              {purchaseBasis === 'snapshot' || purchaseBasis === 'live' ? (
                <InfoRow label="매입가 환산">
                  <span className="font-medium text-slate-900">{formatKRW(purchaseKrw)}</span>
                  <span
                    className={`ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      purchaseBasis === 'snapshot'
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                        : 'bg-amber-50 border border-amber-200 text-amber-700'
                    }`}
                  >
                    {purchaseBasis === 'snapshot'
                      ? `매입 당시 환율${rateAsOf ? ` (${formatDate(rateAsOf)})` : ''}`
                      : '현재 환율 (추정)'}
                  </span>
                </InfoRow>
              ) : null}
              <InfoRow label="실 결제 KRW">{formatKRW(order.actual_cost_krw)}</InfoRow>
              <InfoRow label="총 판매가">
                {totalSale != null ? (
                  <span className="font-semibold text-emerald-700">{formatKRW(totalSale)}</span>
                ) : '—'}
              </InfoRow>
            </dl>
            {(() => {
              // 마진율 경고: 매입 원가(estimated_cost_krw 또는 환율 환산) + totalSale 둘 다 있을 때만
              if (
                totalSale == null ||
                purchaseKrw == null ||
                !Number.isFinite(purchaseKrw) ||
                purchaseKrw <= 0
              ) {
                return (
                  <p className="mt-2 text-[10px] text-slate-400">
                    매입가 또는 판매가가 없어 마진을 계산할 수 없습니다.
                  </p>
                )
              }
              const margin = totalSale - purchaseKrw
              const rate = (margin / totalSale) * 100
              const basisNote =
                purchaseBasis === 'snapshot'
                  ? ' · 매입 당시 환율 기준'
                  : purchaseBasis === 'live'
                    ? ' · 현재 환율 추정'
                    : ''
              if (rate >= 5) {
                return (
                  <p className="mt-2 text-[10px] text-emerald-600">
                    마진율 {rate.toFixed(1)}% (양호){basisNote}
                  </p>
                )
              }
              const negative = rate < 0
              return (
                <div className={`mt-2 rounded-md border px-2.5 py-2 ${negative ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
                  <p className={`text-[11px] font-semibold ${negative ? 'text-rose-900' : 'text-amber-900'}`}>
                    {negative ? `마진 음수 (${rate.toFixed(1)}%)` : `마진율 낮음 (${rate.toFixed(1)}%)`}
                  </p>
                  <p className={`text-[10px] mt-0.5 leading-relaxed ${negative ? 'text-rose-800' : 'text-amber-800'}`}>
                    배대지·관세·플랫폼 수수료 고려 시 실 마진은 더 줄어듭니다.{basisNote}
                  </p>
                </div>
              )
            })()}
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
