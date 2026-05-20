/**
 * DELETE /api/imports/supplier-orders/[id]
 *   영수증 삭제 (재수집 시 같은 orderID 가 다시 들어올 수 있도록).
 *
 * PATCH /api/imports/supplier-orders/[id]
 *   영수증 ↔ b2b_orders 매칭/매칭 해제.
 *   Body: { matched_order_id: string | null }
 *     - string: 해당 주문에 매칭 (+ matched_at = now)
 *     - null: 매칭 해제
 *
 * 인증: 셀러 로그인 세션. (확장 토큰 인증 X — 사용자 의도 명확한 액션이라 웹 UI 에서만)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function authAccount() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) {
    return { error: NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 }) }
  }
  return { account }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const auth = await authAccount()
  if ('error' in auth) return auth.error

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('b2b_supplier_purchases')
    .delete()
    .eq('id', id)
    .eq('account_id', auth.account.id)

  if (error) {
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const auth = await authAccount()
  if ('error' in auth) return auth.error

  let body: { matched_order_id?: unknown }
  try {
    body = (await request.json()) as { matched_order_id?: unknown }
  } catch {
    return NextResponse.json({ error: 'JSON 본문이 잘못되었습니다.' }, { status: 400 })
  }

  const raw = body.matched_order_id
  const matchedOrderId =
    raw === null || raw === '' || raw === undefined
      ? null
      : typeof raw === 'string' && /^[0-9a-f-]{36}$/i.test(raw)
        ? raw
        : 'invalid'
  if (matchedOrderId === 'invalid') {
    return NextResponse.json(
      { error: 'matched_order_id 가 잘못된 UUID 입니다.' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adb = admin as any

  // 매칭하려는 주문이 본인 소유인지 검증
  if (matchedOrderId) {
    const { data: ord } = await adb
      .from('b2b_orders')
      .select('id, account_id')
      .eq('id', matchedOrderId)
      .single()
    if (!ord || ord.account_id !== auth.account.id) {
      return NextResponse.json({ error: '해당 주문이 없거나 권한 없음' }, { status: 404 })
    }
  }

  // 변경 전 값 가져오기 (audit log 용)
  const { data: prev } = await adb
    .from('b2b_supplier_purchases')
    .select('matched_order_id')
    .eq('id', id)
    .eq('account_id', auth.account.id)
    .maybeSingle()

  const { error } = await adb
    .from('b2b_supplier_purchases')
    .update({
      matched_order_id: matchedOrderId,
      matched_at: matchedOrderId ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('account_id', auth.account.id)

  if (error) {
    return NextResponse.json({ error: '매칭 저장 실패', detail: error.message }, { status: 500 })
  }

  // Audit log — 매칭/해제 이력 (실패해도 본 작업은 성공 처리)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = await createClient() as any
  const { data: { user: authUser } } = await sb.auth.getUser()
  const oldValue = prev?.matched_order_id ?? null
  const reason = matchedOrderId
    ? (oldValue ? 'manual_rematch' : 'manual_link')
    : 'manual_unlink'
  await adb.from('b2b_supplier_purchases_audit').insert({
    receipt_id: id,
    account_id: auth.account.id,
    changed_by_user_id: authUser?.id ?? null,
    field_name: 'matched_order_id',
    old_value: oldValue,
    new_value: matchedOrderId,
    reason,
  })

  return NextResponse.json({ ok: true })
}
