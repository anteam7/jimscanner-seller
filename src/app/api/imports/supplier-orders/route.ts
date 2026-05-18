/**
 * POST /api/imports/supplier-orders
 *
 * 브라우저 확장이 호출. Bearer 토큰 인증 (b2b_seller_tokens).
 * 멱등: account_id + source + supplier_order_number unique.
 *
 * Body:
 * {
 *   source: 'amazon_us' | 'amazon_jp' | 'rakuten' | 'yahoo',
 *   supplier_order_number: string,
 *   purchased_at?: string (ISO),
 *   currency?: string,
 *   subtotal_foreign?: number,
 *   shipping_foreign?: number,
 *   tax_foreign?: number,
 *   total_foreign?: number,
 *   items: Array<{ name: string, qty?: number, unit_price?: number, asin?: string,
 *                  image_url?: string, product_url?: string }>,
 *   source_url?: string,
 *   raw_meta?: Record<string, unknown>
 * }
 *
 * 응답:
 *   201 { ok: true, id, status: 'created' }
 *   200 { ok: true, id, status: 'existing' }  (이미 있음 — 덮어쓰지 않음)
 *   400/401/500
 */
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import { authenticateSellerToken } from '@/lib/b2b/seller-tokens'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_SOURCES = ['amazon_us', 'amazon_jp', 'rakuten', 'yahoo'] as const
type Source = (typeof VALID_SOURCES)[number]

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400, headers: CORS_HEADERS })
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t) return null
  return t.slice(0, max)
}

export async function POST(request: Request) {
  const auth = await authenticateSellerToken(request)
  if (!auth) {
    return NextResponse.json(
      { error: '유효한 Bearer 토큰이 필요합니다.' },
      { status: 401, headers: CORS_HEADERS },
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return badRequest('JSON 본문이 잘못되었습니다.')
  }

  const source = body.source
  if (typeof source !== 'string' || !VALID_SOURCES.includes(source as Source)) {
    return badRequest(`source 가 잘못되었습니다 (허용: ${VALID_SOURCES.join(', ')}).`)
  }

  const supplierOrderNumber = str(body.supplier_order_number, 128)
  if (!supplierOrderNumber) {
    return badRequest('supplier_order_number 가 필요합니다.')
  }

  const itemsRaw = Array.isArray(body.items) ? body.items : []
  type ItemIn = Record<string, unknown>
  const items = (itemsRaw as ItemIn[])
    .map((it) => ({
      name: str(it.name, 500),
      qty: num(it.qty) ?? 1,
      unit_price: num(it.unit_price),
      asin: str(it.asin, 32),
      image_url: str(it.image_url, 500),
      product_url: str(it.product_url, 1000),
    }))
    .filter((it) => it.name)

  const currency = str(body.currency, 8)?.toUpperCase() ?? null
  const purchasedAtRaw = str(body.purchased_at, 64)
  const purchasedAt = purchasedAtRaw
    ? Number.isFinite(Date.parse(purchasedAtRaw))
      ? new Date(purchasedAtRaw).toISOString()
      : null
    : null

  const sourceUrl = str(body.source_url, 1000)
  const rawMeta =
    body.raw_meta && typeof body.raw_meta === 'object' && !Array.isArray(body.raw_meta)
      ? (body.raw_meta as Record<string, unknown>)
      : null

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adb = admin as any

  // 멱등: 기존 row 있으면 그대로 반환
  const { data: existing } = await adb
    .from('b2b_supplier_purchases')
    .select('id')
    .eq('account_id', auth.account_id)
    .eq('source', source)
    .eq('supplier_order_number', supplierOrderNumber)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { ok: true, id: existing.id, status: 'existing' },
      { status: 200, headers: CORS_HEADERS },
    )
  }

  const { data: row, error } = await adb
    .from('b2b_supplier_purchases')
    .insert({
      account_id: auth.account_id,
      source,
      supplier_order_number: supplierOrderNumber,
      purchased_at: purchasedAt,
      currency,
      subtotal_foreign: num(body.subtotal_foreign),
      shipping_foreign: num(body.shipping_foreign),
      tax_foreign: num(body.tax_foreign),
      total_foreign: num(body.total_foreign),
      items,
      source_url: sourceUrl,
      raw_meta: rawMeta,
    })
    .select('id')
    .single()

  if (error || !row) {
    return NextResponse.json(
      { error: '저장 실패', detail: error?.message },
      { status: 500, headers: CORS_HEADERS },
    )
  }

  return NextResponse.json(
    { ok: true, id: row.id, status: 'created' },
    { status: 201, headers: CORS_HEADERS },
  )
}
