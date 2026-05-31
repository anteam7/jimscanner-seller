/**
 * /api/imports/supplier-orders/[id]/matches
 *
 * GET: 영수증의 모든 매칭 목록 (1:N)
 * POST: 새 매칭 추가 { order_id, order_item_id?, amount_share_foreign?, note? }
 *   - 같은 영수증에 여러 주문 매칭 가능
 *   - 첫 매칭이면 b2b_supplier_purchases.matched_order_id 도 sync (호환성)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import { logOrderStatusChange } from '@/lib/b2b/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}
function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}
function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t) return null
  return t.slice(0, max)
}

async function authAccount() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) }
  const { data: account } = await sb.from('b2b_accounts').select('id').eq('user_id', user.id).single()
  if (!account) return { error: NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 }) }
  return { sb, accountId: account.id, user }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authAccount()
  if ('error' in auth) return auth.error

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('b2b_supplier_purchase_matches')
    .select(`id, receipt_id, order_id, order_item_id, amount_share_foreign, match_confidence, matched_at, note,
             b2b_orders(id, order_number, market_order_number, marketplace, buyer_name)`)
    .eq('account_id', auth.accountId)
    .eq('receipt_id', id)
    .order('matched_at', { ascending: false })

  if (error) return NextResponse.json({ error: '조회 실패', detail: error.message }, { status: 500 })
  return NextResponse.json({ matches: data ?? [] })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authAccount()
  if ('error' in auth) return auth.error

  let body: Record<string, unknown>
  try { body = (await request.json()) as Record<string, unknown> } catch {
    return NextResponse.json({ error: 'JSON 본문이 잘못되었습니다.' }, { status: 400 })
  }

  const orderId = isUuid(body.order_id) ? body.order_id : null
  if (!orderId) return NextResponse.json({ error: 'order_id 필요' }, { status: 400 })
  const orderItemId = isUuid(body.order_item_id) ? body.order_item_id : null
  const amountShareForeign = num(body.amount_share_foreign)
  const matchConfidence = num(body.match_confidence)
  const note = str(body.note, 500)

  const admin = createAdminClient()

  // 영수증·주문 본인 소유 검증
  const { data: receipt } = await admin
    .from('b2b_supplier_purchases')
    .select('id, account_id')
    .eq('id', id)
    .single()
  if (!receipt || receipt.account_id !== auth.accountId) {
    return NextResponse.json({ error: '영수증 권한 없음' }, { status: 404 })
  }
  const { data: order } = await admin
    .from('b2b_orders')
    .select('id, account_id')
    .eq('id', orderId)
    .single()
  if (!order || order.account_id !== auth.accountId) {
    return NextResponse.json({ error: '주문 권한 없음' }, { status: 404 })
  }

  const { data: inserted, error } = await admin
    .from('b2b_supplier_purchase_matches')
    .insert({
      account_id: auth.accountId,
      receipt_id: id,
      order_id: orderId,
      order_item_id: orderItemId,
      amount_share_foreign: amountShareForeign,
      match_confidence: matchConfidence,
      matched_by_user_id: auth.user.id,
      note,
    })
    .select('id')
    .single()
  if (error || !inserted) {
    const code = (error as { code?: string } | null)?.code
    if (code === '23505') {
      return NextResponse.json({ error: '이미 매칭된 조합입니다.' }, { status: 409 })
    }
    return NextResponse.json({ error: '저장 실패', detail: error?.message }, { status: 500 })
  }

  // 호환성: 첫 매칭이면 matched_order_id sync
  await admin.from('b2b_supplier_purchases')
    .update({ matched_order_id: orderId, matched_at: new Date().toISOString() })
    .eq('id', id)
    .eq('account_id', auth.accountId)
    .is('matched_order_id', null)

  // 자동 status 진행: 주문이 pending/confirmed 면 paid (해외 매입 완료) 로 변경
  // 매칭됐다는 건 매입이 실제로 일어났다는 신호
  const { data: ord } = await admin
    .from('b2b_orders')
    .select('status')
    .eq('id', orderId)
    .eq('account_id', auth.accountId)
    .single()
  if (ord && (ord.status === 'pending' || ord.status === 'confirmed')) {
    await admin.from('b2b_orders')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('account_id', auth.accountId)
    await logOrderStatusChange(admin, {
      accountId: auth.accountId,
      orderId,
      from: ord.status,
      to: 'paid',
      userId: auth.user.id,
      via: 'match',
      note: '영수증 매칭으로 자동 전환',
    })
  }

  // Audit log
  await admin.from('b2b_supplier_purchases_audit').insert({
    receipt_id: id,
    account_id: auth.accountId,
    changed_by_user_id: auth.user.id,
    field_name: 'matches',
    old_value: null,
    new_value: orderId,
    reason: 'multi_match_add',
  })

  return NextResponse.json({ ok: true, id: inserted.id }, { status: 201 })
}
