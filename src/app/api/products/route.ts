/**
 * GET /api/products      — 본인 SKU 목록 (q 검색)
 * POST /api/products     — 신규 SKU + 매핑 nested insert
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type MarketLinkInput = {
  marketplace: string
  market_product_id: string
  market_option?: string | null
  sale_price_krw?: number | null
  notes?: string | null
}

type SupplierLinkInput = {
  supplier_site: string
  supplier_product_url?: string | null
  supplier_unit_price?: number | null
  supplier_currency?: string | null
  is_primary?: boolean
  notes?: string | null
}

type ProductInput = {
  seller_sku: string
  display_name: string
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
  market_links?: MarketLinkInput[]
  supplier_links?: SupplierLinkInput[]
}

export async function GET(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  const includeInactive = url.searchParams.get('include_inactive') === '1'

  let qb = db
    .from('b2b_products')
    .select(
      'id, seller_sku, display_name, english_name, category, default_supplier_site, default_currency, default_unit_price, default_forwarder_id, default_weight_kg, image_url, is_active, created_at, updated_at',
    )
    .eq('account_id', account.id)
    .order('updated_at', { ascending: false })
    .limit(200)

  if (!includeInactive) qb = qb.eq('is_active', true)
  if (q) {
    const term = q.replace(/[%,]/g, '')
    qb = qb.or(`seller_sku.ilike.%${term}%,display_name.ilike.%${term}%,english_name.ilike.%${term}%`)
  }

  const { data, error } = await qb
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products: data ?? [] })
}

export async function POST(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  let body: ProductInput
  try {
    body = (await request.json()) as ProductInput
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const sku = body.seller_sku?.trim()
  const name = body.display_name?.trim()
  if (!sku) return NextResponse.json({ error: 'SKU 코드를 입력해주세요.' }, { status: 400 })
  if (!name) return NextResponse.json({ error: '상품명을 입력해주세요.' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  // 중복 검사
  const { data: existing } = await db
    .from('b2b_products')
    .select('id')
    .eq('account_id', account.id)
    .eq('seller_sku', sku)
    .maybeSingle()
  if (existing) {
    return NextResponse.json(
      { error: `SKU '${sku}' 가 이미 존재합니다.` },
      { status: 409 },
    )
  }

  const { data: inserted, error: insErr } = await db
    .from('b2b_products')
    .insert({
      account_id: account.id,
      seller_sku: sku,
      display_name: name,
      english_name: body.english_name?.trim() || null,
      category: body.category?.trim() || null,
      default_supplier_site: body.default_supplier_site || null,
      default_currency: body.default_currency || null,
      default_unit_price:
        body.default_unit_price != null && body.default_unit_price > 0
          ? body.default_unit_price
          : null,
      default_forwarder_id: body.default_forwarder_id || null,
      default_forwarder_country: body.default_forwarder_country || null,
      default_weight_kg:
        body.default_weight_kg != null && body.default_weight_kg > 0
          ? body.default_weight_kg
          : null,
      image_url: body.image_url?.trim() || null,
      notes: body.notes?.trim() || null,
      is_active: body.is_active !== false,
    })
    .select('id')
    .single()

  if (insErr || !inserted) {
    return NextResponse.json({ error: insErr?.message ?? '저장 실패' }, { status: 500 })
  }

  const productId = inserted.id as string

  // market links
  if (Array.isArray(body.market_links) && body.market_links.length > 0) {
    const rows = body.market_links
      .filter((m) => m.marketplace && m.market_product_id)
      .map((m) => ({
        product_id: productId,
        marketplace: m.marketplace,
        market_product_id: m.market_product_id,
        market_option: m.market_option || null,
        sale_price_krw: m.sale_price_krw ?? null,
        notes: m.notes || null,
      }))
    if (rows.length > 0) {
      const { error } = await db.from('b2b_product_market_links').insert(rows)
      if (error) {
        await db.from('b2b_products').delete().eq('id', productId)
        return NextResponse.json({ error: `마켓 매핑 저장 실패: ${error.message}` }, { status: 500 })
      }
    }
  }

  // supplier links
  if (Array.isArray(body.supplier_links) && body.supplier_links.length > 0) {
    const rows = body.supplier_links
      .filter((s) => s.supplier_site)
      .map((s) => ({
        product_id: productId,
        supplier_site: s.supplier_site,
        supplier_product_url: s.supplier_product_url || null,
        supplier_unit_price: s.supplier_unit_price ?? null,
        supplier_currency: s.supplier_currency || null,
        is_primary: !!s.is_primary,
        notes: s.notes || null,
      }))
    if (rows.length > 0) {
      const { error } = await db.from('b2b_product_supplier_links').insert(rows)
      if (error) {
        await db.from('b2b_products').delete().eq('id', productId)
        return NextResponse.json({ error: `매입처 저장 실패: ${error.message}` }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ id: productId }, { status: 201 })
}
