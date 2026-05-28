/**
 * PATCH /api/products/[id]/favorite — is_favorite 토글 (body: { is_favorite: boolean })
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

  let body: { is_favorite?: boolean }
  try {
    body = (await request.json()) as { is_favorite?: boolean }
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }
  if (typeof body.is_favorite !== 'boolean') {
    return NextResponse.json({ error: 'is_favorite (boolean) 가 필요합니다.' }, { status: 400 })
  }

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  const { data: product } = await sb
    .from('b2b_products')
    .select('id, account_id')
    .eq('id', id)
    .maybeSingle()
  if (!product) return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 })
  if (product.account_id !== account.id) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const { error } = await sb
    .from('b2b_products')
    .update({ is_favorite: body.is_favorite })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, is_favorite: body.is_favorite })
}
