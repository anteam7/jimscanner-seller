/**
 * GET /api/extension/orders
 *
 * 브라우저 확장의 [🪄 자동 채우기] 버튼이 호출.
 * 셀러의 active 주문 + 매칭된 매입 영수증을 묶어서 반환.
 *
 * 응답 형태 (filler 가 통합형 / 분리형 어디든 활용):
 *   {
 *     orders: [{
 *       id, order_number, market_order_number, marketplace, status, request_notes,
 *       buyer: { name, phone, postal_code, address, detail_address, customs_code },
 *       items: [{ supplier_site, supplier_order_number, product_name, brand,
 *                  qty, unit_price_foreign, currency, product_url, tracking_number_overseas }],
 *       matched_receipts: [{ id, source, supplier_order_number, currency, total_foreign,
 *                            items: [...], purchased_at }],
 *       forwarder: { id, name, slug }
 *     }]
 *   }
 *
 * 인증: Bearer (b2b_seller_tokens)
 */
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import { authenticateSellerToken } from '@/lib/b2b/seller-tokens'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
}

const ACTIVE_STATUS = ['pending', 'confirmed', 'paid', 'forwarder_submitted'] as const

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(request: Request) {
  const auth = await authenticateSellerToken(request)
  if (!auth) {
    return NextResponse.json(
      { error: '유효한 Bearer 토큰이 필요합니다.' },
      { status: 401, headers: CORS_HEADERS },
    )
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adb = admin as any

  const { data: ordersData, error } = await adb
    .from('b2b_orders')
    .select(
      `id, order_number, market_order_number, marketplace, status, request_notes,
       buyer_name, buyer_phone, buyer_postal_code, buyer_address, buyer_detail_address, buyer_customs_code,
       forwarder_id, forwarders(name, slug),
       b2b_order_items(id, supplier_site, supplier_order_number, product_name, quantity, unit_price_foreign, currency, product_url, tracking_number_overseas, brand)`,
    )
    .eq('account_id', auth.account_id)
    .in('status', ACTIVE_STATUS)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json(
      { error: '조회 실패', detail: error.message },
      { status: 500, headers: CORS_HEADERS },
    )
  }

  type OrderRow = {
    id: string
    order_number: string | null
    market_order_number: string | null
    marketplace: string | null
    status: string
    request_notes: string | null
    buyer_name: string | null
    buyer_phone: string | null
    buyer_postal_code: string | null
    buyer_address: string | null
    buyer_detail_address: string | null
    buyer_customs_code: string | null
    forwarder_id: string | null
    forwarders: { name: string; slug: string } | null
    b2b_order_items: {
      id: string
      supplier_site: string | null
      supplier_order_number: string | null
      product_name: string | null
      quantity: number | null
      unit_price_foreign: number | string | null
      currency: string | null
      product_url: string | null
      tracking_number_overseas: string | null
      brand: string | null
    }[]
  }

  const orders = (ordersData ?? []) as OrderRow[]
  const orderIds = orders.map((o) => o.id)

  // 매칭된 영수증 일괄 fetch
  type ReceiptRow = {
    id: string
    source: string
    supplier_order_number: string
    purchased_at: string | null
    currency: string | null
    total_foreign: number | string | null
    items: unknown
    matched_order_id: string | null
  }
  let receiptsByOrderId = new Map<string, ReceiptRow[]>()
  if (orderIds.length > 0) {
    const { data: receiptsData } = await adb
      .from('b2b_supplier_purchases')
      .select('id, source, supplier_order_number, purchased_at, currency, total_foreign, items, matched_order_id')
      .eq('account_id', auth.account_id)
      .in('matched_order_id', orderIds)
    const receipts = (receiptsData ?? []) as ReceiptRow[]
    receiptsByOrderId = receipts.reduce((acc, r) => {
      if (!r.matched_order_id) return acc
      const list = acc.get(r.matched_order_id) ?? []
      list.push(r)
      acc.set(r.matched_order_id, list)
      return acc
    }, new Map<string, ReceiptRow[]>())
  }

  const result = orders.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    market_order_number: o.market_order_number,
    marketplace: o.marketplace,
    status: o.status,
    request_notes: o.request_notes,
    buyer: {
      name: o.buyer_name,
      phone: o.buyer_phone,
      postal_code: o.buyer_postal_code,
      address: o.buyer_address,
      detail_address: o.buyer_detail_address,
      customs_code: o.buyer_customs_code,
    },
    items: (o.b2b_order_items ?? []).map((it) => ({
      id: it.id,
      supplier_site: it.supplier_site,
      supplier_order_number: it.supplier_order_number,
      product_name: it.product_name,
      brand: it.brand,
      qty: it.quantity,
      unit_price_foreign: it.unit_price_foreign,
      currency: it.currency,
      product_url: it.product_url,
      tracking_number_overseas: it.tracking_number_overseas,
    })),
    matched_receipts: (receiptsByOrderId.get(o.id) ?? []).map((r) => ({
      id: r.id,
      source: r.source,
      supplier_order_number: r.supplier_order_number,
      purchased_at: r.purchased_at,
      currency: r.currency,
      total_foreign: r.total_foreign,
      items: Array.isArray(r.items) ? r.items : [],
    })),
    forwarder: o.forwarders
      ? { id: o.forwarder_id, name: o.forwarders.name, slug: o.forwarders.slug }
      : null,
    // legacy helper
    first_product: o.b2b_order_items?.[0]?.product_name ?? null,
  }))

  return NextResponse.json({ orders: result }, { headers: CORS_HEADERS })
}
