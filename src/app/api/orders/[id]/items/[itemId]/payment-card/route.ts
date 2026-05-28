/**
 * PATCH /api/orders/[id]/items/[itemId]/payment-card
 *
 * 라인 아이템의 결제 카드 매핑 (payment_card_id) 업데이트.
 * body: { payment_card_id: string | null }  — null 이면 해제.
 *
 * #idea-4 — 2026-05-28
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { payment_card_id?: string | null }

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id: orderId, itemId } = await params
  if (!isUuid(orderId) || !isUuid(itemId)) {
    return NextResponse.json({ error: '잘못된 ID 입니다.' }, { status: 400 })
  }

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const cardId = body.payment_card_id == null ? null : String(body.payment_card_id).trim() || null
  if (cardId != null && !isUuid(cardId)) {
    return NextResponse.json({ error: '잘못된 카드 ID 입니다.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  const { data: order } = await admin
    .from('b2b_orders')
    .select('id, account_id')
    .eq('id', orderId)
    .eq('account_id', account.id)
    .single()
  if (!order) return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })

  const { data: item } = await admin
    .from('b2b_order_items')
    .select('id, order_id')
    .eq('id', itemId)
    .eq('order_id', orderId)
    .single()
  if (!item) return NextResponse.json({ error: '라인을 찾을 수 없습니다.' }, { status: 404 })

  if (cardId) {
    const { data: card } = await admin
      .from('b2b_payment_cards')
      .select('id, account_id, deleted_at')
      .eq('id', cardId)
      .single()
    if (!card || card.account_id !== account.id || card.deleted_at != null) {
      return NextResponse.json({ error: '카드를 찾을 수 없습니다.' }, { status: 404 })
    }
  }

  const { error } = await admin
    .from('b2b_order_items')
    .update({ payment_card_id: cardId })
    .eq('id', itemId)

  if (error) {
    return NextResponse.json({ error: '업데이트 중 오류: ' + error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
