import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  const { data: account } = await sb.from('b2b_accounts').select('id').eq('user_id', user.id).single()
  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })
  const { error } = await sb.from('b2b_product_mappings').delete().eq('id', id).eq('account_id', account.id)
  if (error) return NextResponse.json({ error: '삭제 실패', detail: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
