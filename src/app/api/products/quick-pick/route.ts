/**
 * GET /api/products/quick-pick — 즐겨찾기 + 최근 매입 SKU (주문 작성 quick-pick 용)
 *
 * 응답:
 * - favorites: is_favorite=true 인 SKU (display 우선)
 * - recents: last_purchased_at DESC (favorites 제외, 최근 매입한 것)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SELECT_COLS =
  'id, seller_sku, display_name, english_name, default_supplier_site, default_currency, default_unit_price, default_forwarder_id, default_forwarder_country, default_weight_kg, image_url, is_favorite, last_purchased_at'

export async function GET() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  const { data: favRows } = await sb
    .from('b2b_products')
    .select(SELECT_COLS)
    .eq('account_id', account.id)
    .eq('is_active', true)
    .eq('is_favorite', true)
    .order('last_purchased_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(8)

  const favIds = new Set((favRows ?? []).map((r) => r.id))

  const { data: recentRows } = await sb
    .from('b2b_products')
    .select(SELECT_COLS)
    .eq('account_id', account.id)
    .eq('is_active', true)
    .not('last_purchased_at', 'is', null)
    .order('last_purchased_at', { ascending: false, nullsFirst: false })
    .limit(20)

  const recents = (recentRows ?? []).filter((r) => !favIds.has(r.id)).slice(0, 8)

  return NextResponse.json({
    favorites: favRows ?? [],
    recents,
  })
}
