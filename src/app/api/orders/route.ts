import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// b2b_orders_market_fields.sql 의 화이트리스트와 일치
const VALID_MARKETPLACES = [
  'coupang', 'smartstore', 'auction', 'gmarket', '11st',
  'interpark', 'wemakeprice', 'tmon', 'kakao_gift',
  'own_mall', 'kakao_channel', 'instagram', 'other',
]

const VALID_SUPPLIER_SITES = [
  'amazon_us', 'amazon_jp', 'amazon_de', 'amazon_uk', 'amazon_ca',
  'rakuten_jp', 'yahoo_jp', 'mercari_jp', 'zozotown',
  'taobao', 'tmall', 'aliexpress', 'jd', 'pinduoduo',
  'ebay', 'walmart', 'target',
  'shopee', 'lazada',
  'farfetch', 'ssense', 'matchesfashion', 'mytheresa',
  'other',
]

const VALID_CURRENCIES = ['USD', 'JPY', 'CNY', 'EUR', 'KRW', 'GBP', 'HKD']

type ItemInput = {
  product_name?: unknown
  product_url?: unknown
  quantity?: unknown
  currency?: unknown
  unit_price_foreign?: unknown
  weight_kg?: unknown
  supplier_site?: unknown
  supplier_order_number?: unknown
  sale_price_krw?: unknown
  market_product_id?: unknown
  market_option?: unknown
  product_id?: unknown
}

type CreateOrderBody = {
  // 셀러 내부 식별
  order_number?: unknown
  order_date?: unknown
  // 마켓
  marketplace?: unknown
  market_order_number?: unknown
  market_commission_krw?: unknown
  shipping_fee_krw?: unknown
  // 마켓 구매자 (배송 수신자)
  buyer_name?: unknown
  buyer_phone?: unknown
  buyer_postal_code?: unknown
  buyer_address?: unknown
  buyer_detail_address?: unknown
  buyer_customs_code?: unknown
  // 배대지
  forwarder_id?: unknown
  forwarder_country?: unknown
  // 메모
  request_notes?: unknown
  internal_notes?: unknown
  // 라인 아이템
  items?: unknown
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function nonNegNumber(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function nonNegBigint(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.floor(n)
}

function posInt(v: unknown, fallback = 1): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.floor(n)
}

function isISODate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

export async function GET(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any

  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })
  }

  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const marketplace = url.searchParams.get('marketplace')
  const q = url.searchParams.get('q')
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50), 1), 200)

  let qb = db
    .from('b2b_orders')
    .select(
      'id, order_number, status, order_date, marketplace, market_order_number, buyer_name, request_notes, created_at, b2b_order_items(product_name, sale_price_krw)',
    )
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) qb = qb.eq('status', status)
  if (marketplace) qb = qb.eq('marketplace', marketplace)
  if (q) {
    const safe = q.replace(/[%,]/g, '')
    // 셀러 내부 주문번호 또는 마켓 주문번호로 검색
    qb = qb.or(`order_number.ilike.%${safe}%,market_order_number.ilike.%${safe}%`)
  }

  const { data, error } = await qb
  if (error) {
    return NextResponse.json({ error: '주문 목록을 가져오지 못했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ orders: data ?? [] })
}

export async function POST(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let body: CreateOrderBody
  try {
    body = (await request.json()) as CreateOrderBody
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  // ─── 식별 ───
  const orderNumber = str(body.order_number, 64)
  if (!orderNumber) {
    return NextResponse.json({ error: '셀러 내부 주문번호를 입력해 주세요.' }, { status: 400 })
  }
  const orderDate = isISODate(body.order_date)
    ? body.order_date
    : new Date().toISOString().slice(0, 10)

  // ─── 마켓 ───
  const marketplaceRaw = typeof body.marketplace === 'string' ? body.marketplace.trim() : null
  const marketplace =
    marketplaceRaw && VALID_MARKETPLACES.includes(marketplaceRaw) ? marketplaceRaw : null
  const marketOrderNumber = str(body.market_order_number, 128)
  const marketCommissionKrw = nonNegBigint(body.market_commission_krw)
  const shippingFeeKrw = nonNegBigint(body.shipping_fee_krw)

  // ─── 구매자 (배대지 양식의 수신자) ───
  const buyerName = str(body.buyer_name, 120)
  const buyerPhone = str(body.buyer_phone, 40)
  const buyerPostalCode = str(body.buyer_postal_code, 16)
  const buyerAddress = str(body.buyer_address, 300)
  const buyerDetailAddress = str(body.buyer_detail_address, 200)
  const buyerCustomsCode = str(body.buyer_customs_code, 32)

  // ─── 배대지 ───
  const forwarderId = isUuid(body.forwarder_id) ? body.forwarder_id : null
  const forwarderCountry = str(body.forwarder_country, 10)

  // ─── 메모 ───
  const requestNotes = str(body.request_notes, 2000)
  const internalNotes = str(body.internal_notes, 2000)

  // ─── 라인 아이템 ───
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: '상품을 1개 이상 입력해 주세요.' }, { status: 400 })
  }

  const items = (body.items as ItemInput[]).map((it, idx) => {
    const productName = str(it.product_name, 300)
    if (!productName) return null
    const quantity = posInt(it.quantity, 1)
    const currencyRaw = typeof it.currency === 'string' ? it.currency.toUpperCase() : null
    const currency = currencyRaw && VALID_CURRENCIES.includes(currencyRaw) ? currencyRaw : null
    const unitPrice = nonNegNumber(it.unit_price_foreign)
    const weight = nonNegNumber(it.weight_kg)
    const totalForeign = unitPrice != null ? Number((unitPrice * quantity).toFixed(2)) : null
    const supplierSiteRaw = typeof it.supplier_site === 'string' ? it.supplier_site.trim() : null
    const supplierSite =
      supplierSiteRaw && VALID_SUPPLIER_SITES.includes(supplierSiteRaw) ? supplierSiteRaw : null
    const salePriceKrw = nonNegBigint(it.sale_price_krw)
    return {
      display_order: idx,
      product_name: productName,
      product_url: str(it.product_url, 500),
      quantity,
      currency,
      unit_price_foreign: unitPrice,
      total_price_foreign: totalForeign,
      weight_kg: weight,
      supplier_site: supplierSite,
      supplier_order_number: str(it.supplier_order_number, 128),
      sale_price_krw: salePriceKrw,
      market_product_id: str(it.market_product_id, 128),
      market_option: str(it.market_option, 200),
      product_id: isUuid(it.product_id) ? it.product_id : null,
    }
  })

  if (items.some((x) => x === null) || items.length === 0) {
    return NextResponse.json({ error: '상품명을 모두 입력해 주세요.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any

  // 사업자 계정
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })
  }

  // 쿼터 / grace period 체크
  const { data: sub } = await db
    .from('b2b_subscriptions')
    .select(
      'monthly_order_used, monthly_order_quota_override, status, b2b_subscription_plans(monthly_order_quota)',
    )
    .eq('account_id', account.id)
    .single()

  if (sub) {
    if (sub.status === 'past_due') {
      return NextResponse.json(
        { error: '결제 실패 상태에서는 신규 주문을 등록할 수 없습니다. 결제 정보를 먼저 갱신해 주세요.' },
        { status: 402 },
      )
    }
    const planQuota: number | null = sub.b2b_subscription_plans?.monthly_order_quota ?? null
    const effective: number | null = sub.monthly_order_quota_override ?? planQuota
    const used: number = sub.monthly_order_used ?? 0
    if (effective !== null && used >= effective) {
      return NextResponse.json(
        { error: `이번 달 주문 한도(${effective}건)를 초과했습니다. 플랜 업그레이드를 검토해 주세요.` },
        { status: 403 },
      )
    }
  }

  // 주문 insert (마켓 구매자 PII 는 b2b_orders 에 직접 — b2b_clients 자동 upsert 폐기)
  const { data: order, error: oErr } = await db
    .from('b2b_orders')
    .insert({
      account_id: account.id,
      order_number: orderNumber,
      order_date: orderDate,
      source: 'manual',
      status: 'pending',
      marketplace,
      market_order_number: marketOrderNumber,
      market_commission_krw: marketCommissionKrw,
      shipping_fee_krw: shippingFeeKrw,
      buyer_name: buyerName,
      buyer_phone: buyerPhone,
      buyer_postal_code: buyerPostalCode,
      buyer_address: buyerAddress,
      buyer_detail_address: buyerDetailAddress,
      buyer_customs_code: buyerCustomsCode,
      forwarder_id: forwarderId,
      forwarder_country: forwarderCountry,
      request_notes: requestNotes,
      internal_notes: internalNotes,
    })
    .select('id')
    .single()

  if (oErr || !order) {
    const code = (oErr as { code?: string } | null)?.code
    let msg = '주문 등록 중 오류가 발생했습니다.'
    if (code === '23505') msg = '같은 주문번호 또는 같은 마켓 주문번호가 이미 존재합니다.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // 라인 아이템 insert
  const { error: iErr } = await db
    .from('b2b_order_items')
    .insert(items.map((it) => ({ ...it, order_id: order.id })))

  if (iErr) {
    return NextResponse.json(
      { error: '주문은 생성됐으나 상품 등록에 실패했습니다. 운영팀에 문의해 주세요.', order_id: order.id },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, id: order.id, order_number: orderNumber }, { status: 201 })
}
