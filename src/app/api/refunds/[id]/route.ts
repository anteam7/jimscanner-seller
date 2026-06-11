/**
 * /api/refunds/[id]
 *
 * PATCH — 환불 status 전이 + status_history 누적. 옵션 부분 필드 업데이트 (internal_notes, refund_amount_krw, refund_method).
 *
 * #idea-3b — 2026-05-28
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import { logOrderStatusChange } from '@/lib/b2b/audit'
import type { Database } from '../../../../../types/supabase'

type RefundUpdate = Database['public']['Tables']['b2b_refunds']['Update']

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_STATUS = ['requested', 'approved', 'denied', 'processing', 'settled', 'cancelled'] as const

// 단순 모델: 요청 → (승인 | 거절 | 취소) → (처리중 → 정산완료) | (취소). 사용자가 자유롭게 되돌릴 일은 거의 없음.
const VALID_TRANSITIONS: Record<string, string[]> = {
  requested:  ['approved', 'denied', 'cancelled'],
  approved:   ['processing', 'settled', 'cancelled'],
  denied:     ['requested', 'cancelled'],
  processing: ['settled', 'cancelled'],
  settled:    [],
  cancelled:  [],
}

type PatchBody = {
  status?: string
  internal_notes?: string | null
  refund_amount_krw?: number | string | null
  refund_method?: string | null
}

type StatusHistoryEntry = { at: string; from: string | null; to: string; by: string | null }

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: refundId } = await params

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(refundId)) {
    return NextResponse.json({ error: '잘못된 환불 ID' }, { status: 400 })
  }

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let body: PatchBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id, email')
    .eq('user_id', user.id)
    .single()
  if (!account) {
    return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })
  }

  const admin = createAdminClient()
  const { data: refund, error: refundErr } = await admin
    .from('b2b_refunds')
    .select('id, status, status_history, account_id, order_id, refund_amount_krw')
    .eq('id', refundId)
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .single()
  if (refundErr || !refund) {
    return NextResponse.json({ error: '환불 내역을 찾을 수 없습니다.' }, { status: 404 })
  }

  const updates: RefundUpdate = {}
  const nowIso = new Date().toISOString()
  let statusChanged = false
  let nextStatus: string | null = null

  if (body.status !== undefined && body.status !== refund.status) {
    const newStatus = String(body.status)
    if (!(VALID_STATUS as readonly string[]).includes(newStatus)) {
      return NextResponse.json({ error: 'status 값이 올바르지 않습니다.' }, { status: 400 })
    }
    const allowed = VALID_TRANSITIONS[refund.status] ?? []
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `'${refund.status}' 상태에서 '${newStatus}'로 전환할 수 없습니다.` },
        { status: 400 },
      )
    }

    const existingHistory: StatusHistoryEntry[] = Array.isArray(refund.status_history)
      ? (refund.status_history as unknown as StatusHistoryEntry[])
      : []
    const newEntry: StatusHistoryEntry = {
      at: nowIso,
      from: refund.status,
      to: newStatus,
      by: account.email,
    }
    updates.status = newStatus
    updates.status_history = [...existingHistory, newEntry]
    if (newStatus === 'approved') updates.approved_at = nowIso
    if (newStatus === 'settled') updates.settled_at = nowIso
    statusChanged = true
    nextStatus = newStatus
  }

  if (body.internal_notes !== undefined) {
    if (body.internal_notes !== null && body.internal_notes.length > 5000) {
      return NextResponse.json({ error: '메모가 너무 깁니다 (최대 5000자).' }, { status: 400 })
    }
    updates.internal_notes = body.internal_notes
  }

  if (body.refund_method !== undefined) {
    updates.refund_method = body.refund_method
  }

  if (body.refund_amount_krw !== undefined && body.refund_amount_krw !== null && body.refund_amount_krw !== '') {
    const n = typeof body.refund_amount_krw === 'number' ? body.refund_amount_krw : Number(body.refund_amount_krw)
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: '환불 금액이 올바르지 않습니다.' }, { status: 400 })
    }
    updates.refund_amount_krw = Math.round(n)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, status: refund.status })
  }

  const { error: updErr } = await admin
    .from('b2b_refunds')
    .update(updates)
    .eq('id', refundId)
  if (updErr) {
    return NextResponse.json({ error: '환불 변경 중 오류가 발생했습니다: ' + updErr.message }, { status: 500 })
  }

  // status 전이 → 주문 status 도 일부 동기
  if (statusChanged && nextStatus) {
    if (nextStatus === 'settled') {
      // 환불 정산 완료 → 주문 'refunded'
      const { data: orderRow } = await admin
        .from('b2b_orders')
        .select('status')
        .eq('id', refund.order_id)
        .single()
      await admin
        .from('b2b_orders')
        .update({ status: 'refunded', updated_at: nowIso })
        .eq('id', refund.order_id)
      await logOrderStatusChange(admin, {
        accountId: account.id,
        orderId: refund.order_id,
        from: orderRow?.status ?? null,
        to: 'refunded',
        userId: user.id,
        via: 'refund',
        note: '환불 정산 완료로 자동 전환',
      })
    } else if (nextStatus === 'denied' || nextStatus === 'cancelled') {
      // 환불 거절·취소 → 주문이 환불 요청 상태였으면 'completed' 로 복귀
      const { data: orderRow } = await admin
        .from('b2b_orders')
        .select('status')
        .eq('id', refund.order_id)
        .single()
      if (orderRow && orderRow.status === 'refund_requested') {
        await admin
          .from('b2b_orders')
          .update({ status: 'completed', updated_at: nowIso })
          .eq('id', refund.order_id)
        await logOrderStatusChange(admin, {
          accountId: account.id,
          orderId: refund.order_id,
          from: 'refund_requested',
          to: 'completed',
          userId: user.id,
          via: 'refund',
          note: '환불 거절·취소로 주문 복귀',
        })
      }
    }
  }

  return NextResponse.json({ ok: true, status: nextStatus ?? refund.status })
}
