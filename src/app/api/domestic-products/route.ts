/**
 * /api/domestic-products
 *
 * GET: 셀러의 국내 상품 목록 (검색 ?q, 페이지네이션 ?limit)
 * POST: 단건 등록 — { seller_sku?, display_name, marketplace?, market_product_id?, market_option?, sale_price_krw?, category?, image_url?, notes? }
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
function nonNegBigint(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.floor(n)
}

async function getAccountId() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) }
  const { data: account } = await sb.from('b2b_accounts').select('id').eq('user_id', user.id).single()
  if (!account) return { error: NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 }) }
  return { sb, accountId: account.id as string }
}

export async function GET(request: Request) {
  const auth = await getAccountId()
  if ('error' in auth) return auth.error
  const url = new URL(request.url)
  const q = url.searchParams.get('q')
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 100), 1), 200)
  let qb = auth.sb
    .from('b2b_domestic_products')
    .select('id, seller_sku, display_name, marketplace, market_product_id, market_option, sale_price_krw, category, image_url, is_active, updated_at')
    .eq('account_id', auth.accountId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (q) {
    const safe = q.replace(/[%,]/g, '')
    qb = qb.or(`display_name.ilike.%${safe}%,seller_sku.ilike.%${safe}%,market_product_id.ilike.%${safe}%`)
  }
  const { data, error } = await qb
  if (error) return NextResponse.json({ error: '조회 실패', detail: error.message }, { status: 500 })
  return NextResponse.json({ products: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await getAccountId()
  if ('error' in auth) return auth.error
  let body: Record<string, unknown>
  try { body = (await request.json()) as Record<string, unknown> } catch {
    return NextResponse.json({ error: 'JSON 본문이 잘못되었습니다.' }, { status: 400 })
  }
  const displayName = str(body.display_name, 300)
  if (!displayName) return NextResponse.json({ error: 'display_name 이 필요합니다.' }, { status: 400 })
  const payload = {
    account_id: auth.accountId,
    seller_sku: str(body.seller_sku, 64),
    display_name: displayName,
    marketplace: str(body.marketplace, 32),
    market_product_id: str(body.market_product_id, 200),
    market_option: str(body.market_option, 200),
    sale_price_krw: nonNegBigint(body.sale_price_krw),
    category: str(body.category, 100),
    image_url: str(body.image_url, 500),
    notes: str(body.notes, 1000),
  }
  const { data, error } = await auth.sb.from('b2b_domestic_products').insert(payload).select('id').single()
  if (error) {
    const code = (error as { code?: string }).code
    const msg = code === '23505' ? '같은 SKU 가 이미 있습니다.' : '등록 실패'
    return NextResponse.json({ error: msg, detail: error.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
}
