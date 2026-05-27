/**
 * POST /api/imports/supplier-orders/manual
 *
 * 셀러 본인이 수동으로 영수증 등록 (확장 미지원 매입처 — 라쿠텐·타오바오·1688·eBay 등).
 * 로그인 세션 인증 (확장 토큰 X — 사용자 의도 명확한 액션).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_SOURCES = [
  'rakuten', 'yahoo', 'mercari',
  'taobao', 'tmall', 'aliexpress', '1688',
  'amazon_de', 'amazon_uk', 'amazon_ca',
  'ebay', 'walmart', 'target',
  'other',
] as const

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t) return null
  return t.slice(0, max)
}
function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

export async function POST(request: Request) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { data: account } = await sb.from('b2b_accounts').select('id').eq('user_id', user.id).single()
  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  let body: Record<string, unknown>
  try { body = (await request.json()) as Record<string, unknown> } catch {
    return NextResponse.json({ error: 'JSON 본문이 잘못되었습니다.' }, { status: 400 })
  }

  const source = body.source
  if (typeof source !== 'string' || !VALID_SOURCES.includes(source as (typeof VALID_SOURCES)[number])) {
    return NextResponse.json({ error: 'source 가 잘못되었습니다.' }, { status: 400 })
  }
  const supplierOrderNumber = str(body.supplier_order_number, 128)
  if (!supplierOrderNumber) return NextResponse.json({ error: '매입 주문번호 필요' }, { status: 400 })

  const itemsRaw = Array.isArray(body.items) ? body.items : []
  type ItemIn = Record<string, unknown>
  const items = (itemsRaw as ItemIn[])
    .map((it) => ({
      name: str(it.name, 500),
      qty: num(it.qty) ?? 1,
      unit_price: num(it.unit_price),
      product_url: str(it.product_url, 1000),
    }))
    .filter((it) => it.name)

  if (items.length === 0) return NextResponse.json({ error: '상품 1개 이상 필요' }, { status: 400 })

  const currency = str(body.currency, 8)?.toUpperCase() ?? null
  const purchasedAtRaw = str(body.purchased_at, 64)
  const purchasedAt = purchasedAtRaw && Number.isFinite(Date.parse(purchasedAtRaw))
    ? new Date(purchasedAtRaw).toISOString()
    : null

  const admin = createAdminClient()

  // 멱등 — 기존 row 있으면 그대로 반환
  const { data: existing } = await admin
    .from('b2b_supplier_purchases')
    .select('id')
    .eq('account_id', account.id)
    .eq('source', source)
    .eq('supplier_order_number', supplierOrderNumber)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ ok: true, id: existing.id, status: 'existing' })
  }

  const { data: row, error } = await admin
    .from('b2b_supplier_purchases')
    .insert({
      account_id: account.id,
      source,
      supplier_order_number: supplierOrderNumber,
      purchased_at: purchasedAt,
      currency,
      subtotal_foreign: num(body.subtotal_foreign),
      shipping_foreign: num(body.shipping_foreign),
      tax_foreign: num(body.tax_foreign),
      total_foreign: num(body.total_foreign),
      items,
      source_url: str(body.source_url, 1000),
      raw_meta: { manual: true, user_note: str(body.user_note, 500) },
    })
    .select('id')
    .single()

  if (error || !row) {
    return NextResponse.json({ error: '저장 실패', detail: error?.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, id: row.id, status: 'created' }, { status: 201 })
}
