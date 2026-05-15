import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 공통 화이트리스트 (단일 POST 라우트와 일치 — supabase/b2b_orders_market_fields.sql)
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
const VALID_FORWARDER_COUNTRIES = ['US', 'JP', 'CN', 'DE', 'UK', 'HK', 'OTHER']

type BulkRowInput = {
  // 마켓
  marketplace?: unknown
  market_order_number?: unknown
  order_date?: unknown
  order_number?: unknown
  // 구매자
  buyer_name?: unknown
  buyer_phone?: unknown
  buyer_postal_code?: unknown
  buyer_address?: unknown
  buyer_detail_address?: unknown
  buyer_customs_code?: unknown
  // 상품 / 매입 (단일 라인 가정)
  market_product_id?: unknown
  market_option?: unknown
  product_name?: unknown
  quantity?: unknown
  supplier_site?: unknown
  product_url?: unknown
  supplier_order_number?: unknown
  currency?: unknown
  unit_price_foreign?: unknown
  forwarder_country?: unknown
  weight_kg?: unknown
  sale_price_krw?: unknown
  // 배대지
  forwarder_id?: unknown
  forwarder_warehouse?: unknown
  // 기타
  market_commission_krw?: unknown
  shipping_fee_krw?: unknown
  request_notes?: unknown
}

type RowResult =
  | { index: number; ok: true; id: string; order_number: string }
  | { index: number; ok: false; error: string }

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

function autoOrderNumber(): string {
  const d = new Date()
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 9000) + 1000)
  return `ORD-${yy}${mm}${dd}-${rand}`
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

type NormalizedRow = {
  order_number: string
  order_date: string
  marketplace: string | null
  market_order_number: string | null
  buyer_name: string | null
  buyer_phone: string | null
  buyer_postal_code: string | null
  buyer_address: string | null
  buyer_detail_address: string | null
  buyer_customs_code: string | null
  forwarder_id: string | null
  forwarder_country: string | null
  forwarder_warehouse: string | null
  market_commission_krw: number | null
  shipping_fee_krw: number | null
  request_notes: string | null
  item: {
    product_name: string
    product_url: string | null
    quantity: number
    currency: string | null
    unit_price_foreign: number | null
    total_price_foreign: number | null
    weight_kg: number | null
    supplier_site: string | null
    supplier_order_number: string | null
    sale_price_krw: number | null
    market_product_id: string | null
    market_option: string | null
  }
}

function normalizeRow(row: BulkRowInput, idx: number): { ok: true; row: NormalizedRow } | { ok: false; error: string } {
  // 필수: 상품명, 수량(기본 1)
  const productName = str(row.product_name, 300)
  if (!productName) return { ok: false, error: `${idx + 1}행: 상품명이 비어있습니다.` }

  // 필수 권장: 마켓·마켓주문번호·구매자 정보 — 그러나 양식 변환 안 하면 OK
  // v0 에선 상품명만 필수, 나머지는 비어도 등록 가능 (셀러가 양식 변환 시 부족하면 그때 보강)

  const orderNumber = str(row.order_number, 64) ?? autoOrderNumber()
  const orderDate = isISODate(row.order_date) ? (row.order_date as string) : todayISO()

  const marketplaceRaw = typeof row.marketplace === 'string' ? row.marketplace.trim() : null
  const marketplace =
    marketplaceRaw && VALID_MARKETPLACES.includes(marketplaceRaw) ? marketplaceRaw : null
  if (marketplaceRaw && !marketplace) {
    return { ok: false, error: `${idx + 1}행: 마켓 타입 '${marketplaceRaw}' 이 허용 목록에 없습니다.` }
  }

  const currencyRaw = typeof row.currency === 'string' ? row.currency.toUpperCase() : null
  const currency = currencyRaw && VALID_CURRENCIES.includes(currencyRaw) ? currencyRaw : null
  if (currencyRaw && !currency) {
    return { ok: false, error: `${idx + 1}행: 통화 '${currencyRaw}' 이 허용 목록에 없습니다.` }
  }

  const supplierSiteRaw = typeof row.supplier_site === 'string' ? row.supplier_site.trim() : null
  const supplierSite =
    supplierSiteRaw && VALID_SUPPLIER_SITES.includes(supplierSiteRaw) ? supplierSiteRaw : null
  if (supplierSiteRaw && !supplierSite) {
    return { ok: false, error: `${idx + 1}행: 매입처 '${supplierSiteRaw}' 이 허용 목록에 없습니다.` }
  }

  const forwarderCountryRaw = typeof row.forwarder_country === 'string' ? row.forwarder_country.trim().toUpperCase() : null
  const forwarderCountry =
    forwarderCountryRaw && VALID_FORWARDER_COUNTRIES.includes(forwarderCountryRaw) ? forwarderCountryRaw : null
  if (forwarderCountryRaw && !forwarderCountry) {
    return { ok: false, error: `${idx + 1}행: 매입 국가 '${forwarderCountryRaw}' 이 허용 목록에 없습니다.` }
  }

  const forwarderIdRaw = typeof row.forwarder_id === 'string' ? row.forwarder_id.trim() : null
  const forwarderId = isUuid(forwarderIdRaw) ? forwarderIdRaw : null
  if (forwarderIdRaw && !forwarderId) {
    return { ok: false, error: `${idx + 1}행: 배대지 ID 형식이 올바르지 않습니다.` }
  }

  const quantity = posInt(row.quantity, 1)
  const unitPrice = nonNegNumber(row.unit_price_foreign)
  const totalForeign = unitPrice != null ? Number((unitPrice * quantity).toFixed(2)) : null

  return {
    ok: true,
    row: {
      order_number: orderNumber,
      order_date: orderDate,
      marketplace,
      market_order_number: str(row.market_order_number, 128),
      buyer_name: str(row.buyer_name, 120),
      buyer_phone: str(row.buyer_phone, 40),
      buyer_postal_code: str(row.buyer_postal_code, 16),
      buyer_address: str(row.buyer_address, 300),
      buyer_detail_address: str(row.buyer_detail_address, 200),
      buyer_customs_code: str(row.buyer_customs_code, 32),
      forwarder_id: forwarderId,
      forwarder_country: forwarderCountry,
      forwarder_warehouse: str(row.forwarder_warehouse, 100),
      market_commission_krw: nonNegBigint(row.market_commission_krw),
      shipping_fee_krw: nonNegBigint(row.shipping_fee_krw),
      request_notes: str(row.request_notes, 2000),
      item: {
        product_name: productName,
        product_url: str(row.product_url, 500),
        quantity,
        currency,
        unit_price_foreign: unitPrice,
        total_price_foreign: totalForeign,
        weight_kg: nonNegNumber(row.weight_kg),
        supplier_site: supplierSite,
        supplier_order_number: str(row.supplier_order_number, 128),
        sale_price_krw: nonNegBigint(row.sale_price_krw),
        market_product_id: str(row.market_product_id, 128),
        market_option: str(row.market_option, 200),
      },
    },
  }
}

export async function POST(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let body: { rows?: unknown }
  try {
    body = (await request.json()) as { rows?: unknown }
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: '등록할 행이 없습니다.' }, { status: 400 })
  }

  if (body.rows.length > 500) {
    return NextResponse.json({ error: '한 번에 등록할 수 있는 행은 최대 500개입니다.' }, { status: 400 })
  }

  // 행 정규화 + 검증
  const results: RowResult[] = []
  const validRows: { idx: number; data: NormalizedRow }[] = []

  ;(body.rows as BulkRowInput[]).forEach((raw, idx) => {
    const norm = normalizeRow(raw, idx)
    if (!norm.ok) {
      results.push({ index: idx, ok: false, error: norm.error })
    } else {
      validRows.push({ idx, data: norm.row })
    }
  })

  if (validRows.length === 0) {
    return NextResponse.json({ ok: false, success_count: 0, fail_count: results.length, results }, { status: 400 })
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

  // 쿼터 / grace period 체크 (유효 행 수와 한도 비교)
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
        { error: '결제 실패 상태에서는 신규 주문을 등록할 수 없습니다.' },
        { status: 402 },
      )
    }
    const planQuota: number | null = sub.b2b_subscription_plans?.monthly_order_quota ?? null
    const effective: number | null = sub.monthly_order_quota_override ?? planQuota
    const used: number = sub.monthly_order_used ?? 0
    if (effective !== null && used + validRows.length > effective) {
      return NextResponse.json(
        {
          error: `이번 달 주문 한도를 초과합니다 (사용 ${used} / 한도 ${effective}, 등록 시도 ${validRows.length}). 플랜 업그레이드를 검토해 주세요.`,
        },
        { status: 403 },
      )
    }
  }

  // 행 단위 insert (Supabase 는 트랜잭션 미지원 환경 — 행별 단일 실패 격리)
  // 50건 정도까지는 순차 처리, 그 이상은 batch insert 도 고려할 수 있으나
  // 라인 아이템과의 짝 트랜잭션이 row 단위로 필요해 v0 에선 순차로 안전하게.
  for (const { idx, data } of validRows) {
    const { item, ...orderFields } = data
    const { data: order, error: oErr } = await db
      .from('b2b_orders')
      .insert({
        account_id: account.id,
        source: 'excel_upload',
        status: 'pending',
        ...orderFields,
      })
      .select('id')
      .single()

    if (oErr || !order) {
      const code = (oErr as { code?: string } | null)?.code
      const msg =
        code === '23505'
          ? `${idx + 1}행: 같은 주문번호 또는 같은 마켓 주문번호가 이미 존재합니다.`
          : `${idx + 1}행: 주문 등록 실패`
      results.push({ index: idx, ok: false, error: msg })
      continue
    }

    const { error: iErr } = await db.from('b2b_order_items').insert({
      ...item,
      order_id: order.id,
      display_order: 0,
    })

    if (iErr) {
      // 주문은 남아있지만 라인 아이템 실패. 일관성 위해 주문 삭제 시도
      await db.from('b2b_orders').delete().eq('id', order.id)
      results.push({ index: idx, ok: false, error: `${idx + 1}행: 상품 등록 실패 (주문 롤백됨)` })
      continue
    }

    results.push({ index: idx, ok: true, id: order.id, order_number: data.order_number })
  }

  const successCount = results.filter((r) => r.ok).length
  const failCount = results.length - successCount

  return NextResponse.json(
    {
      ok: failCount === 0,
      success_count: successCount,
      fail_count: failCount,
      results: results.sort((a, b) => a.index - b.index),
    },
    { status: failCount === 0 ? 201 : 207 },
  )
}
