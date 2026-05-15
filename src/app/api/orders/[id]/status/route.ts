import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// b2b_orders.status enum 과 일치 (supabase/b2b_schema.sql L267)
const VALID_STATUSES = [
  'pending', 'confirmed', 'paid', 'forwarder_submitted',
  'in_transit', 'arrived_korea', 'delivered', 'completed',
  'cancelled', 'refunded',
]

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:             ['confirmed', 'cancelled'],
  confirmed:           ['paid', 'cancelled'],
  paid:                ['forwarder_submitted', 'cancelled', 'refunded'],
  forwarder_submitted: ['in_transit', 'cancelled', 'refunded'],
  in_transit:          ['arrived_korea', 'cancelled'],
  arrived_korea:       ['delivered'],
  delivered:           ['completed'],
  completed:           [],
  cancelled:           [],
  refunded:            [],
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: orderId } = await params

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let body: { status: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const { status: newStatus } = body
  if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
    return NextResponse.json(
      { error: `상태 값이 올바르지 않습니다. 허용: ${VALID_STATUSES.join(', ')}` },
      { status: 400 },
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const admin = createAdminClient()

  // 사업자 계정 확인
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id, email, business_name')
    .eq('user_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })
  }

  // 주문 소유권 확인 + 현재 상태 조회
  const { data: order, error: orderErr } = await (admin as any)
    .from('b2b_orders')
    .select('id, status, account_id, client_id')
    .eq('id', orderId)
    .eq('account_id', account.id)
    .single()

  if (orderErr || !order) {
    return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
  }

  if (order.status === newStatus) {
    return NextResponse.json({ ok: true, status: newStatus })
  }

  const allowedNext = VALID_TRANSITIONS[order.status] ?? []
  if (!allowedNext.includes(newStatus)) {
    return NextResponse.json(
      { error: `'${order.status}' 상태에서 '${newStatus}'로 전환할 수 없습니다.` },
      { status: 400 },
    )
  }

  // 상태 업데이트
  const { error: updateErr } = await (admin as any)
    .from('b2b_orders')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', orderId)

  if (updateErr) {
    return NextResponse.json({ error: '상태 변경 중 오류가 발생했습니다.' }, { status: 500 })
  }

  // 청약철회 고지 발송 (B2C/구매대행 시절 로직)은 v0 비활성.
  // 마켓 셀러 도메인에선 마켓이 정산·환불 흐름을 관리하므로 셀러 측 직접 발송 불필요.
  // v0.5+ 에서 옵션 토글로 재활성 가능 — git history 의 triggerWithdrawalNotice 참고.

  return NextResponse.json({ ok: true, status: newStatus })
}
