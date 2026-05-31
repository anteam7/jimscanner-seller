/**
 * /api/refunds
 *
 * GET — 본인 계정의 환불 목록 (cursor 페이지네이션). 옵션 ?status=, ?limit=, ?cursor=
 * POST — 환불 row 신규 생성. order_id 소유권 확인 후 row insert + 주문 status 'refund_requested' 변경
 *
 * #idea-3b — 2026-05-28
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import { logOrderStatusChange } from '@/lib/b2b/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_STATUS = ['requested', 'approved', 'denied', 'processing', 'settled', 'cancelled'] as const
const VALID_REASON_CATEGORY = [
  'product_defect',
  'wrong_item',
  'customer_cancel',
  'customs_blocked',
  'market_dispute',
  'shipping_delay',
  'other',
] as const

export async function GET(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ refunds: [], next_cursor: null }, { status: 200 })
  }

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) {
    return NextResponse.json({ refunds: [], next_cursor: null }, { status: 200 })
  }

  const url = new URL(request.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '50'), 1), 200)
  const cursor = url.searchParams.get('cursor')
  const statusFilter = url.searchParams.get('status')

  let query = sb
    .from('b2b_refunds')
    .select(
      'id, account_id, order_id, order_item_id, reason, reason_category, status, refund_amount_krw, refund_method, requested_at, approved_at, settled_at, created_at, updated_at, b2b_orders(order_number, market_order_number, buyer_name, marketplace)',
    )
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .order('requested_at', { ascending: false })
    .limit(limit + 1)

  if (statusFilter && (VALID_STATUS as readonly string[]).includes(statusFilter)) {
    query = query.eq('status', statusFilter)
  }
  if (cursor) {
    query = query.lt('requested_at', cursor)
  }

  const { data: rows, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message, refunds: [], next_cursor: null }, { status: 500 })
  }

  const items = rows ?? []
  const hasMore = items.length > limit
  const pageItems = hasMore ? items.slice(0, limit) : items
  const nextCursor = hasMore ? pageItems[pageItems.length - 1].requested_at : null

  return NextResponse.json({ refunds: pageItems, next_cursor: nextCursor })
}

type PostBody = {
  order_id?: string
  order_item_id?: string | null
  reason?: string
  reason_category?: string | null
  refund_amount_krw?: number | string | null
  refund_method?: string | null
  buyer_message?: string | null
  internal_notes?: string | null
}

export async function POST(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let body: PostBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const orderId = (body.order_id ?? '').trim()
  const reason = (body.reason ?? '').trim()
  if (!orderId) {
    return NextResponse.json({ error: 'order_id 가 필요합니다.' }, { status: 400 })
  }
  if (!reason) {
    return NextResponse.json({ error: '환불 사유를 입력하세요.' }, { status: 400 })
  }
  if (reason.length > 2000) {
    return NextResponse.json({ error: '환불 사유가 너무 깁니다 (최대 2000자).' }, { status: 400 })
  }

  const reasonCategory = body.reason_category ?? null
  if (reasonCategory && !(VALID_REASON_CATEGORY as readonly string[]).includes(reasonCategory)) {
    return NextResponse.json({ error: '환불 사유 분류가 올바르지 않습니다.' }, { status: 400 })
  }

  const refundAmountRaw = body.refund_amount_krw
  let refundAmount = 0
  if (refundAmountRaw != null && refundAmountRaw !== '') {
    const n = typeof refundAmountRaw === 'number' ? refundAmountRaw : Number(refundAmountRaw)
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: '환불 금액이 올바르지 않습니다.' }, { status: 400 })
    }
    refundAmount = Math.round(n)
  }

  const admin = createAdminClient()

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id, email, business_name')
    .eq('user_id', user.id)
    .single()
  if (!account) {
    return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })
  }

  const { data: order, error: orderErr } = await admin
    .from('b2b_orders')
    .select('id, status, account_id')
    .eq('id', orderId)
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .single()
  if (orderErr || !order) {
    return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
  }

  // order_item_id 가 지정됐다면 해당 라인이 이 주문 소속인지 확인
  if (body.order_item_id) {
    const { data: item } = await admin
      .from('b2b_order_items')
      .select('id, order_id')
      .eq('id', body.order_item_id)
      .eq('order_id', orderId)
      .single()
    if (!item) {
      return NextResponse.json({ error: '라인 아이템을 찾을 수 없습니다.' }, { status: 404 })
    }
  }

  const nowIso = new Date().toISOString()
  const initialHistory = [
    {
      at: nowIso,
      from: null,
      to: 'requested',
      by: account.email,
    },
  ]

  const { data: inserted, error: insertErr } = await admin
    .from('b2b_refunds')
    .insert({
      account_id: account.id,
      order_id: orderId,
      order_item_id: body.order_item_id ?? null,
      reason,
      reason_category: reasonCategory,
      refund_amount_krw: refundAmount,
      refund_method: body.refund_method ?? null,
      buyer_message: body.buyer_message ?? null,
      internal_notes: body.internal_notes ?? null,
      status: 'requested',
      status_history: initialHistory,
      requested_at: nowIso,
    })
    .select('id, status, requested_at')
    .single()

  if (insertErr || !inserted) {
    return NextResponse.json(
      { error: '환불 등록 중 오류가 발생했습니다: ' + (insertErr?.message ?? 'unknown') },
      { status: 500 },
    )
  }

  // 주문 상태가 환불 흐름 진입을 허용하면 'refund_requested' 로 전환
  // 이미 cancelled/refunded 인 주문은 건드리지 않음
  const ALLOW_TRANSITION_TO_REFUND_REQUESTED = new Set([
    'pending',
    'confirmed',
    'paid',
    'forwarder_submitted',
    'delivered',
    'completed',
  ])
  if (ALLOW_TRANSITION_TO_REFUND_REQUESTED.has(order.status)) {
    await admin
      .from('b2b_orders')
      .update({ status: 'refund_requested', updated_at: nowIso })
      .eq('id', orderId)
    await logOrderStatusChange(admin, {
      accountId: account.id,
      orderId,
      from: order.status,
      to: 'refund_requested',
      userId: user.id,
      via: 'refund',
      note: '환불 요청 등록으로 자동 전환',
    })
  }

  return NextResponse.json({ ok: true, id: inserted.id, status: inserted.status })
}
