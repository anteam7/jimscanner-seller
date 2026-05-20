/**
 * GET /api/extension/orders
 *
 * 브라우저 확장의 [🪄 자동 채우기] 버튼이 호출.
 * 셀러의 최근 주문 (status pending/confirmed/paid) + 첫 라인 아이템 묶어서 반환.
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

  const { data, error } = await adb
    .from('b2b_orders')
    .select(
      `id, order_number, market_order_number, marketplace, status, notes,
       buyer_name, buyer_phone, buyer_postal_code, buyer_address, buyer_detail_address, buyer_customs_code,
       forwarder_id, forwarders(name, slug),
       b2b_order_items(id, supplier_site, supplier_order_number, product_name, qty, unit_price_foreign, currency, product_url, tracking_number_overseas)`,
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
    notes: string | null
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
      qty: number | null
      unit_price_foreign: number | string | null
      currency: string | null
      product_url: string | null
      tracking_number_overseas: string | null
    }[]
  }

  const orders = ((data ?? []) as OrderRow[]).map((o) => ({
    id: o.id,
    order_number: o.order_number,
    market_order_number: o.market_order_number,
    marketplace: o.marketplace,
    status: o.status,
    notes: o.notes,
    buyer_name: o.buyer_name,
    buyer_phone: o.buyer_phone,
    buyer_postal_code: o.buyer_postal_code,
    buyer_address: o.buyer_address,
    buyer_detail_address: o.buyer_detail_address,
    buyer_customs_code: o.buyer_customs_code,
    forwarder_id: o.forwarder_id,
    forwarder_name: o.forwarders?.name ?? null,
    forwarder_slug: o.forwarders?.slug ?? null,
    first_product: o.b2b_order_items?.[0]?.product_name ?? null,
    items: o.b2b_order_items?.map((it) => ({
      id: it.id,
      supplier_site: it.supplier_site,
      supplier_order_number: it.supplier_order_number,
      product_name: it.product_name,
      qty: it.qty,
      unit_price_foreign: it.unit_price_foreign,
      currency: it.currency,
      product_url: it.product_url,
      tracking_number_overseas: it.tracking_number_overseas,
    })) ?? [],
  }))

  return NextResponse.json({ orders }, { headers: CORS_HEADERS })
}
