/**
 * GET    /api/products/[id]  — 단건 (market_links + supplier_links 포함)
 * PATCH  /api/products/[id]  — 메타 + 매핑 replace
 * DELETE /api/products/[id]  — soft (is_active=false). 영구는 query ?hard=1 (사용 중 주문 있으면 거부)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function ownerProduct(sb: unknown, userId: string, id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', userId)
    .single()
  if (!account) return { error: '사업자 계정이 없습니다.', status: 404 as const }
  const { data: p } = await db
    .from('b2b_products')
    .select('id, account_id')
    .eq('id', id)
    .maybeSingle()
  if (!p) return { error: '상품을 찾을 수 없습니다.', status: 404 as const }
  if (p.account_id !== account.id) return { error: '권한 없음', status: 403 as const }
  return { db, account, product: p }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: '잘못된 ID' }, { status: 400 })

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const ctx = await ownerProduct(sb, user.id, id)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { data, error } = await ctx.db
    .from('b2b_products')
    .select(
      '*, b2b_product_market_links(id, marketplace, market_product_id, market_option, sale_price_krw, notes), b2b_product_supplier_links(id, supplier_site, supplier_product_url, supplier_unit_price, supplier_currency, is_primary, notes)',
    )
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ product: data })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: '잘못된 ID' }, { status: 400 })

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  type Body = {
    display_name?: string
    english_name?: string | null
    category?: string | null
    default_supplier_site?: string | null
    default_currency?: string | null
    default_unit_price?: number | null
    default_forwarder_id?: string | null
    default_forwarder_country?: string | null
    default_weight_kg?: number | null
    image_url?: string | null
    notes?: string | null
    is_active?: boolean
    market_links?: Array<{
      marketplace: string
      market_product_id: string
      market_option?: string | null
      sale_price_krw?: number | null
      notes?: string | null
    }> | null
    supplier_links?: Array<{
      supplier_site: string
      supplier_product_url?: string | null
      supplier_unit_price?: number | null
      supplier_currency?: string | null
      is_primary?: boolean
      notes?: string | null
    }> | null
  }
  let body: Body = {}
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const ctx = await ownerProduct(sb, user.id, id)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const patch: Record<string, unknown> = {}
  if (typeof body.display_name === 'string' && body.display_name.trim())
    patch.display_name = body.display_name.trim()
  for (const k of [
    'english_name',
    'category',
    'default_supplier_site',
    'default_currency',
    'default_forwarder_id',
    'default_forwarder_country',
    'image_url',
    'notes',
  ] as const) {
    if (k in body) patch[k] = (body[k] as string | null)?.toString().trim() || null
  }
  for (const k of ['default_unit_price', 'default_weight_kg'] as const) {
    if (k in body) {
      const v = body[k]
      patch[k] = v != null && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null
    }
  }
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active

  if (Object.keys(patch).length > 0) {
    const { error } = await ctx.db.from('b2b_products').update(patch).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // market_links replace (전달된 경우에만)
  if (body.market_links !== undefined) {
    await ctx.db.from('b2b_product_market_links').delete().eq('product_id', id)
    if (Array.isArray(body.market_links) && body.market_links.length > 0) {
      const rows = body.market_links
        .filter((m) => m.marketplace && m.market_product_id)
        .map((m) => ({
          product_id: id,
          marketplace: m.marketplace,
          market_product_id: m.market_product_id,
          market_option: m.market_option || null,
          sale_price_krw: m.sale_price_krw ?? null,
          notes: m.notes || null,
        }))
      if (rows.length > 0) {
        const { error } = await ctx.db.from('b2b_product_market_links').insert(rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
  }

  // supplier_links replace
  if (body.supplier_links !== undefined) {
    await ctx.db.from('b2b_product_supplier_links').delete().eq('product_id', id)
    if (Array.isArray(body.supplier_links) && body.supplier_links.length > 0) {
      const rows = body.supplier_links
        .filter((s) => s.supplier_site)
        .map((s) => ({
          product_id: id,
          supplier_site: s.supplier_site,
          supplier_product_url: s.supplier_product_url || null,
          supplier_unit_price: s.supplier_unit_price ?? null,
          supplier_currency: s.supplier_currency || null,
          is_primary: !!s.is_primary,
          notes: s.notes || null,
        }))
      if (rows.length > 0) {
        const { error } = await ctx.db.from('b2b_product_supplier_links').insert(rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: '잘못된 ID' }, { status: 400 })

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const ctx = await ownerProduct(sb, user.id, id)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const url = new URL(request.url)
  const hard = url.searchParams.get('hard') === '1'

  if (hard) {
    // 사용 중 주문 확인
    const { count } = await ctx.db
      .from('b2b_order_items')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id)
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: `이 SKU 를 사용 중인 주문이 ${count}건 있어 영구 삭제할 수 없습니다. 비활성화를 사용하세요.` },
        { status: 409 },
      )
    }
    const { error } = await ctx.db.from('b2b_products').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // soft delete: is_active=false
    const { error } = await ctx.db.from('b2b_products').update({ is_active: false }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
