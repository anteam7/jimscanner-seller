/**
 * DELETE /api/imports/supplier-orders/[id]
 * 셀러 본인 영수증 삭제 (재수집 시 같은 orderID 가 다시 들어올 수 있도록).
 *
 * 인증: 셀러 로그인 세션. (확장 토큰 인증 X — 사용자 의도 명확한 액션이라 웹 UI 에서만)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

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

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('b2b_supplier_purchases')
    .delete()
    .eq('id', id)
    .eq('account_id', account.id)

  if (error) {
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
