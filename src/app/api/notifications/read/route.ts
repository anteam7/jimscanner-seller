/**
 * POST /api/notifications/read
 * Body: { ids?: string[], all?: boolean }
 * 지정된 알림(또는 전체)을 읽음 처리.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let body: { ids?: unknown; all?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) {
    return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })
  }

  const now = new Date().toISOString()

  if (body.all === true) {
    const { error } = await sb
      .from('b2b_notifications')
      .update({ read_at: now })
      .eq('account_id', account.id)
      .is('read_at', null)
    if (error) return NextResponse.json({ error: '업데이트 실패' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((v): v is string => typeof v === 'string')
    : []
  if (ids.length === 0) {
    return NextResponse.json({ error: 'ids 또는 all 이 필요합니다.' }, { status: 400 })
  }

  const { error } = await sb
    .from('b2b_notifications')
    .update({ read_at: now })
    .eq('account_id', account.id)
    .in('id', ids)
  if (error) return NextResponse.json({ error: '업데이트 실패' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
