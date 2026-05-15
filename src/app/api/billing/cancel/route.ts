import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { sendCancellationEmail } from '@/lib/b2b/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_REASONS = ['기능 부족', '가격 부담', '사업 중단', '타 서비스 이전', '기타']

type CancelPayload = {
  reason: string
  reason_detail?: string
  accept_offer?: boolean
}

export async function GET() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any

  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })
  }

  const { data: sub } = await db
    .from('b2b_subscriptions')
    .select('status, period_end')
    .eq('account_id', account.id)
    .single()

  if (!sub) {
    return NextResponse.json({ error: '구독 정보가 없습니다.' }, { status: 404 })
  }

  return NextResponse.json({ period_end: sub.period_end ?? null, status: sub.status })
}

export async function POST(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let body: CancelPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const { reason, reason_detail, accept_offer } = body

  if (!reason || !VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: '취소 이유를 선택해 주세요.' }, { status: 400 })
  }

  if (reason === '기타' && !reason_detail?.trim()) {
    return NextResponse.json({ error: '기타 사유를 입력해 주세요.' }, { status: 400 })
  }

  if (reason_detail && reason_detail.length > 500) {
    return NextResponse.json({ error: '기타 사유는 500자 이내로 입력해 주세요.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any

  const { data: account } = await db
    .from('b2b_accounts')
    .select('id, business_name')
    .eq('user_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })
  }

  const { data: sub } = await db
    .from('b2b_subscriptions')
    .select('id, status, period_end, discount_override_pct')
    .eq('account_id', account.id)
    .single()

  if (!sub) {
    return NextResponse.json({ error: '구독 정보가 없습니다.' }, { status: 404 })
  }

  if (sub.status === 'cancelled') {
    return NextResponse.json({ error: '이미 취소된 구독입니다.' }, { status: 400 })
  }

  // 오퍼 수락: 3개월 30% 할인 적용
  if (accept_offer === true) {
    // idempotency: 이미 오퍼를 수락한 경우 재수락 불가 (무제한 기간 연장 방지)
    if (sub.discount_override_pct != null) {
      return NextResponse.json({ error: '이미 오퍼를 수락하셨습니다.' }, { status: 409 })
    }

    const currentEnd = sub.period_end ? new Date(sub.period_end) : new Date()
    const newPeriodEnd = new Date(currentEnd.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()

    const { error: offerErr } = await db
      .from('b2b_subscriptions')
      .update({
        discount_override_pct: 30,
        period_end: newPeriodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sub.id)

    if (offerErr) {
      console.error('[billing/cancel] 오퍼 업데이트 실패:', offerErr)
      return NextResponse.json({ error: '처리 중 오류가 발생했습니다. 다시 시도해 주세요.' }, { status: 500 })
    }

    try {
      await db.from('b2b_audit_log').insert({
        account_id: account.id,
        user_id: user.id,
        action: 'subscription_offer_accepted',
        metadata: { reason, discount_pct: 30, new_period_end: newPeriodEnd },
      })
    } catch (auditErr) {
      console.error('[billing/cancel] audit_log insert 실패:', auditErr)
    }

    return NextResponse.json({ accepted_offer: true })
  }

  // 취소 확정
  const reasonText =
    reason === '기타' && reason_detail?.trim()
      ? `기타: ${reason_detail.trim()}`
      : reason

  const expiresAt = sub.period_end ? new Date(sub.period_end) : null

  const { error: cancelErr } = await db
    .from('b2b_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reasonText,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sub.id)

  if (cancelErr) {
    console.error('[billing/cancel] 취소 업데이트 실패:', cancelErr)
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다. 다시 시도해 주세요.' }, { status: 500 })
  }

  try {
    await db.from('b2b_audit_log').insert({
      account_id: account.id,
      user_id: user.id,
      action: 'subscription_cancelled',
      metadata: { reason, reason_detail: reason_detail ?? null },
    })
  } catch (auditErr) {
    console.error('[billing/cancel] audit_log insert 실패:', auditErr)
  }

  if (user.email) {
    try {
      await sendCancellationEmail(user.email, account.business_name ?? null, expiresAt)
    } catch (err) {
      console.error('[billing/cancel] 이메일 발송 실패:', err)
    }
  }

  return NextResponse.json({ cancelled: true })
}
