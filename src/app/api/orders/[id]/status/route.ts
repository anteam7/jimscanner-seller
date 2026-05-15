import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import { sendWithdrawalNoticeEmail } from '@/lib/b2b/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_STATUSES = ['pending', 'processing', 'shipped', 'completed', 'cancelled']

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:    ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped:    ['completed', 'cancelled'],
  completed:  [],
  cancelled:  [],
}

const DEFAULT_WITHDRAWAL_TEXT =
  '구매하신 상품을 수령한 날로부터 7일 이내 청약 철회가 가능합니다 (전자상거래법 제17조).'

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
    .select('id, email, business_name, withdrawal_notice_enabled, withdrawal_notice_custom_text')
    .eq('user_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })
  }

  // 주문 소유권 확인 + 현재 상태 조회
  // b2b_orders 테이블이 구현되면 FK 확인 가능; 현재는 account_id 소유 확인
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

  // 완료 전환 시 청약철회 고지 발송
  if (newStatus === 'completed' && account.withdrawal_notice_enabled !== false) {
    try {
      await triggerWithdrawalNotice({
        admin,
        account,
        orderId,
        clientId: order.client_id,
      })
    } catch (e) {
      console.error('[withdrawal-notice] 발송 중 오류 (주문 상태는 변경됨):', e)
    }
  }

  return NextResponse.json({ ok: true, status: newStatus })
}

async function triggerWithdrawalNotice({
  admin,
  account,
  orderId,
  clientId,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any
  account: {
    id: string
    email: string
    business_name: string | null
    withdrawal_notice_custom_text: string | null
  }
  orderId: string
  clientId: string | null
}) {
  // 의뢰자 연락처 조회 (b2b_clients 테이블)
  let clientEmail: string | null = null
  let clientPhone: string | null = null

  if (clientId) {
    const { data: client } = await admin
      .from('b2b_clients')
      .select('email, phone')
      .eq('id', clientId)
      .single()
    if (client) {
      clientEmail = client.email ?? null
      clientPhone = client.phone ?? null
    }
  }

  const noticeText =
    account.withdrawal_notice_custom_text?.trim() || DEFAULT_WITHDRAWAL_TEXT

  const contentSnapshot = `[${new Date().toISOString()}] 수신: ${clientEmail ?? clientPhone ?? '연락처 없음'} | 사업자: ${account.business_name ?? account.email} | 내용: ${noticeText}`

  let deliveryStatus: 'sent' | 'failed' | 'unknown' = 'unknown'
  let recipientContact: string | null = null
  let channel: 'email' | 'kakao' | 'unknown' = 'unknown'

  if (clientEmail) {
    recipientContact = clientEmail
    channel = 'email'
    const sent = await sendWithdrawalNoticeEmail(
      clientEmail,
      account.business_name,
      noticeText,
    )
    deliveryStatus = sent ? 'sent' : 'failed'
  } else if (clientPhone) {
    // 카카오 알림톡 미구현 — 향후 Phase S 연동 시 교체
    recipientContact = clientPhone.slice(-4).padStart(clientPhone.length, '*')
    channel = 'kakao'
    deliveryStatus = 'unknown'
  }

  // 발송 기록 insert (성공 여부 무관)
  await admin.from('b2b_withdrawal_notices').insert({
    account_id: account.id,
    order_id: orderId,
    client_id: clientId,
    channel,
    recipient_contact: recipientContact,
    content_snapshot: contentSnapshot,
    delivery_status: deliveryStatus,
  })
}
