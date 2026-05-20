/**
 * /api/product-mappings
 *
 * GET: 셀러의 매칭 목록. ?domestic=<id> 필터 (특정 국내 상품 기준 해외 상품들)
 *      또는 ?foreign=<id> (특정 해외 상품 기준 국내 상품들)
 *      필터 없으면 전체 (limit 100).
 *
 * POST: { domestic_product_id, foreign_product_id, qty_ratio?, notes? }
 *       N:N 이므로 같은 쌍 중복 시 23505 → 'already mapped' 응답.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

async function getAccount() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db.from('b2b_accounts').select('id').eq('user_id', user.id).single()
  if (!account) return { error: NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 }) }
  return { db, accountId: account.id as string }
}

export async function GET(request: Request) {
  const auth = await getAccount()
  if ('error' in auth) return auth.error
  const url = new URL(request.url)
  const domestic = url.searchParams.get('domestic')
  const foreign = url.searchParams.get('foreign')
  let qb = auth.db
    .from('b2b_product_mappings')
    .select(
      `id, qty_ratio, notes, created_at,
       domestic_product_id, foreign_product_id,
       b2b_domestic_products(id, seller_sku, display_name, marketplace, sale_price_krw, image_url),
       b2b_products(id, seller_sku, display_name, english_name, default_supplier_site, default_currency, default_unit_price, image_url)`,
    )
    .eq('account_id', auth.accountId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (isUuid(domestic)) qb = qb.eq('domestic_product_id', domestic)
  if (isUuid(foreign)) qb = qb.eq('foreign_product_id', foreign)
  const { data, error } = await qb
  if (error) return NextResponse.json({ error: '조회 실패', detail: error.message }, { status: 500 })
  return NextResponse.json({ mappings: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await getAccount()
  if ('error' in auth) return auth.error
  let body: Record<string, unknown>
  try { body = (await request.json()) as Record<string, unknown> } catch {
    return NextResponse.json({ error: 'JSON 본문이 잘못되었습니다.' }, { status: 400 })
  }
  const domesticId = isUuid(body.domestic_product_id) ? body.domestic_product_id : null
  const foreignId = isUuid(body.foreign_product_id) ? body.foreign_product_id : null
  if (!domesticId || !foreignId) {
    return NextResponse.json({ error: 'domestic_product_id 와 foreign_product_id 가 필요합니다.' }, { status: 400 })
  }
  const qtyRatio = num(body.qty_ratio) ?? 1
  const notes = str(body.notes, 500)
  const { data, error } = await auth.db
    .from('b2b_product_mappings')
    .insert({ account_id: auth.accountId, domestic_product_id: domesticId, foreign_product_id: foreignId, qty_ratio: qtyRatio, notes })
    .select('id')
    .single()
  if (error) {
    const code = (error as { code?: string }).code
    if (code === '23505') {
      return NextResponse.json({ error: '이미 매칭된 조합입니다.' }, { status: 409 })
    }
    return NextResponse.json({ error: '매칭 실패', detail: error.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
}
