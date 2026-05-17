/**
 * PATCH /api/orders/[id]/items/[itemId]/tracking
 *
 * 라인 아이템의 운송장 정보 (tracking_number, tracking_number_overseas, carrier) 업데이트.
 * 셀러가 매입처 → 배대지 → 국내 배송 진행 중 단계별로 입력.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  tracking_number?: string | null
  tracking_number_overseas?: string | null
  carrier?: string | null
}

function clean(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t) return null
  return t.slice(0, max)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id: orderId, itemId } = await params

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const admin = createAdminClient()

  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) {
    return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })
  }

  // 주문 소유권 확인
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error: orderErr } = await (admin as any)
    .from('b2b_orders')
    .select('id, account_id')
    .eq('id', orderId)
    .eq('account_id', account.id)
    .single()
  if (orderErr || !order) {
    return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
  }

  // 라인 소유권 확인
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: item, error: itemErr } = await (admin as any)
    .from('b2b_order_items')
    .select('id, order_id')
    .eq('id', itemId)
    .eq('order_id', orderId)
    .single()
  if (itemErr || !item) {
    return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 })
  }

  const patch: Record<string, string | null> = {}
  if ('tracking_number' in body) patch.tracking_number = clean(body.tracking_number, 128)
  if ('tracking_number_overseas' in body) patch.tracking_number_overseas = clean(body.tracking_number_overseas, 128)
  if ('carrier' in body) patch.carrier = clean(body.carrier, 64)

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '업데이트할 필드가 없습니다.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (admin as any)
    .from('b2b_order_items')
    .update(patch)
    .eq('id', itemId)

  if (updateErr) {
    return NextResponse.json({ error: '업데이트 중 오류가 발생했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, patched: patch })
}
