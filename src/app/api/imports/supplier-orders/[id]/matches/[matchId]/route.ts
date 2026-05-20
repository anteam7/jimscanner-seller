import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; matchId: string }> }) {
  const { id, matchId } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db.from('b2b_accounts').select('id').eq('user_id', user.id).single()
  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adb = admin as any

  // 삭제 전 order_id 가져오기 (matched_order_id sync 용)
  const { data: match } = await adb
    .from('b2b_supplier_purchase_matches')
    .select('order_id')
    .eq('id', matchId)
    .eq('receipt_id', id)
    .eq('account_id', account.id)
    .maybeSingle()
  if (!match) return NextResponse.json({ error: '매칭이 없거나 권한 없음' }, { status: 404 })

  const { error } = await adb
    .from('b2b_supplier_purchase_matches')
    .delete()
    .eq('id', matchId)
    .eq('account_id', account.id)
  if (error) return NextResponse.json({ error: '삭제 실패', detail: error.message }, { status: 500 })

  // 남은 매칭 있으면 matched_order_id 를 다른 매칭으로 sync. 없으면 NULL.
  const { data: remain } = await adb
    .from('b2b_supplier_purchase_matches')
    .select('order_id')
    .eq('receipt_id', id)
    .eq('account_id', account.id)
    .order('matched_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  await adb.from('b2b_supplier_purchases')
    .update({
      matched_order_id: remain?.order_id ?? null,
      matched_at: remain ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('account_id', account.id)

  // Audit
  await adb.from('b2b_supplier_purchases_audit').insert({
    receipt_id: id,
    account_id: account.id,
    changed_by_user_id: user.id,
    field_name: 'matches',
    old_value: match.order_id,
    new_value: remain?.order_id ?? null,
    reason: 'multi_match_remove',
  })

  return NextResponse.json({ ok: true })
}
