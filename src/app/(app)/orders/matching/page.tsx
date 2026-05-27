import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'
import { OrderMatchingClient } from './OrderMatchingClient'
import {
  findCandidates,
  type OrderForMatching,
  type ReceiptForMatching,
} from '@/lib/b2b/import-matcher'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '주문매칭관리 · 짐스캐너 SELLER',
  description: '국내 주문 ↔ 해외 영수증 매칭 통합 관리.',
  robots: { index: false, follow: false },
}

const MARKETPLACE_LABEL: Record<string, string> = {
  coupang: '쿠팡', smartstore: '스마트스토어', auction: '옥션', gmarket: '지마켓',
  '11st': '11번가', wemakeprice: '위메프', tmon: '티몬', interpark: '인터파크',
  kakao_gift: '카카오선물', own_mall: '자사몰', kakao_channel: '카카오채널', instagram: '인스타', other: '기타',
}

const SOURCE_LABEL: Record<string, string> = {
  amazon_us: '아마존 US', amazon_jp: '아마존 JP', rakuten: '라쿠텐', yahoo: '야후',
}

type OrderRow = {
  id: string
  order_number: string | null
  market_order_number: string | null
  marketplace: string | null
  status: string
  buyer_name: string | null
  created_at: string
  b2b_order_items: {
    supplier_site: string | null
    currency: string | null
    quantity: number | null
    unit_price_foreign: number | string | null
    product_name: string | null
  }[]
}
type ReceiptRow = {
  id: string
  source: string
  supplier_order_number: string
  purchased_at: string | null
  currency: string | null
  total_foreign: number | string | null
  matched_order_id: string | null
}

export default async function OrderMatchingPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return <div className="p-8 text-sm text-slate-600">로그인이 필요합니다.</div>
  const { data: account } = await sb.from('b2b_accounts').select('id').eq('user_id', user.id).single()
  if (!account) return <div className="p-8 text-sm text-slate-600">사업자 계정이 없습니다.</div>

  const [ordersRes, receiptsRes] = await Promise.all([
    sb.from('b2b_orders')
      .select('id, order_number, market_order_number, marketplace, status, buyer_name, created_at, b2b_order_items(supplier_site, currency, quantity, unit_price_foreign, product_name)')
      .eq('account_id', account.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(200),
    sb.from('b2b_supplier_purchases')
      .select('id, source, supplier_order_number, purchased_at, currency, total_foreign, matched_order_id')
      .eq('account_id', account.id)
      .order('purchased_at', { ascending: false, nullsFirst: false })
      .limit(200),
  ])
  const orders = (ordersRes.data ?? []) as OrderRow[]
  const receipts = (receiptsRes.data ?? []) as ReceiptRow[]

  // 통계
  const totalOrders = orders.length
  const matchedOrderIds = new Set(receipts.filter((r) => r.matched_order_id).map((r) => r.matched_order_id!))
  const matchedOrders = orders.filter((o) => matchedOrderIds.has(o.id)).length
  const unmatchedReceipts = receipts.filter((r) => !r.matched_order_id).length

  // 매칭 추천 계산: 매칭 안 된 영수증마다 top 1 추천
  const orderCandidates: OrderForMatching[] = orders.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    market_order_number: o.market_order_number,
    marketplace: o.marketplace,
    created_at: o.created_at,
    has_matched_receipt: matchedOrderIds.has(o.id),
    items: (o.b2b_order_items ?? []).map((it) => ({
      supplier_site: it.supplier_site,
      currency: it.currency,
      qty: it.quantity,
      unit_price_foreign: it.unit_price_foreign,
    })),
  }))

  function orderLabel(o: OrderRow): string {
    const num = o.market_order_number || o.order_number || '주문'
    const mk = o.marketplace ? MARKETPLACE_LABEL[o.marketplace] ?? o.marketplace : ''
    return mk ? `${mk} ${num}` : num
  }

  const orderById = new Map<string, OrderRow>()
  for (const o of orders) orderById.set(o.id, o)

  const items = receipts.map((r) => {
    const matched = r.matched_order_id ? orderById.get(r.matched_order_id) : null
    let suggestion: { orderId: string; label: string; score: number } | null = null
    if (!matched) {
      const receipt: ReceiptForMatching = {
        id: r.id,
        source: r.source,
        purchased_at: r.purchased_at,
        currency: r.currency,
        total_foreign: r.total_foreign,
      }
      const cands = findCandidates(receipt, orderCandidates, 1)
      if (cands[0]) {
        const target = orderById.get(cands[0].order.id)
        if (target) suggestion = { orderId: target.id, label: orderLabel(target), score: cands[0].score }
      }
    }
    return {
      receipt: r,
      matched_order_label: matched ? orderLabel(matched) : null,
      suggestion,
    }
  })

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          <span className="bg-gradient-to-r from-indigo-600 to-amber-600 bg-clip-text text-transparent">주문매칭관리</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          국내 주문 ↔ 해외 영수증 매칭을 한 화면에서 관리합니다. 매칭된 주문만 크롬 확장의 자동 채우기 대상이 됩니다.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg bg-white shadow-sm border-l-[3px] border-l-indigo-500 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">국내 주문</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{totalOrders.toLocaleString('ko-KR')}건</p>
        </div>
        <div className="rounded-lg bg-white shadow-sm border-l-[3px] border-l-emerald-500 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">매칭된 주문</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{matchedOrders.toLocaleString('ko-KR')}건</p>
          <p className="mt-0.5 text-[11px] text-emerald-700">확장 자동 채우기 대상</p>
        </div>
        <div className="rounded-lg bg-white shadow-sm border-l-[3px] border-l-amber-500 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">매칭 대기 영수증</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{unmatchedReceipts.toLocaleString('ko-KR')}건</p>
          <p className="mt-0.5 text-[11px] text-amber-700">국내 주문과 연결 필요</p>
        </div>
      </div>

      <OrderMatchingClient
        items={items.map((it) => ({
          receiptId: it.receipt.id,
          source: it.receipt.source,
          sourceLabel: SOURCE_LABEL[it.receipt.source] ?? it.receipt.source,
          supplier_order_number: it.receipt.supplier_order_number,
          purchased_at: it.receipt.purchased_at,
          total_foreign: it.receipt.total_foreign,
          currency: it.receipt.currency,
          matched_order_label: it.matched_order_label,
          suggestion: it.suggestion,
        }))}
      />

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-3 text-[11px] text-slate-600">
        영수증 단일 매칭/해제는 <Link href="/imports" className="text-indigo-700 hover:underline font-semibold">해외 주문 목록 (/imports)</Link> 에서도 가능합니다.
      </div>
    </div>
  )
}
