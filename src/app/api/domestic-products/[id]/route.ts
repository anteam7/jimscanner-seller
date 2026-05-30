/**
 * PATCH /api/domestic-products/[id] — 부분 수정
 * DELETE /api/domestic-products/[id] — soft delete (is_active=false)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import type { Database } from '../../../../../types/supabase'

type DomesticProductUpdate = Database['public']['Tables']['b2b_domestic_products']['Update']

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

async function authAccount() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) }
  const { data: account } = await sb.from('b2b_accounts').select('id').eq('user_id', user.id).single()
  if (!account) return { error: NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 }) }
  return { db: sb, accountId: account.id as string }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authAccount()
  if ('error' in auth) return auth.error
  let body: Record<string, unknown>
  try { body = (await request.json()) as Record<string, unknown> } catch {
    return NextResponse.json({ error: 'JSON 본문이 잘못되었습니다.' }, { status: 400 })
  }
  const patch: DomesticProductUpdate = {}
  if ('display_name' in body) {
    const displayName = str(body.display_name, 300)
    if (!displayName) return NextResponse.json({ error: 'display_name 은 비울 수 없습니다.' }, { status: 400 })
    patch.display_name = displayName
  }
  if ('seller_sku' in body) patch.seller_sku = str(body.seller_sku, 64)
  if ('marketplace' in body) patch.marketplace = str(body.marketplace, 32)
  if ('market_product_id' in body) patch.market_product_id = str(body.market_product_id, 200)
  if ('market_option' in body) patch.market_option = str(body.market_option, 200)
  if ('sale_price_krw' in body) patch.sale_price_krw = nonNegBigint(body.sale_price_krw)
  if ('category' in body) patch.category = str(body.category, 100)
  if ('image_url' in body) patch.image_url = str(body.image_url, 500)
  if ('notes' in body) patch.notes = str(body.notes, 1000)
  if ('is_active' in body) patch.is_active = body.is_active === true
  patch.updated_at = new Date().toISOString()
  const { error } = await auth.db.from('b2b_domestic_products').update(patch).eq('id', id).eq('account_id', auth.accountId)
  if (error) return NextResponse.json({ error: '수정 실패', detail: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authAccount()
  if ('error' in auth) return auth.error
  const { error } = await auth.db
    .from('b2b_domestic_products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('account_id', auth.accountId)
  if (error) return NextResponse.json({ error: '삭제 실패', detail: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
