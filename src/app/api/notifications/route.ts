/**
 * GET /api/notifications?limit=20
 * 셀러 본인의 최근 알림 + unread_count.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ notifications: [], unread_count: 0 }, { status: 200 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) {
    return NextResponse.json({ notifications: [], unread_count: 0 }, { status: 200 })
  }

  const url = new URL(request.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '20'), 1), 100)

  const { data: rows, error } = await db
    .from('b2b_notifications')
    .select('id, type, title, body, link, read_at, created_at')
    .eq('account_id', account.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    // 테이블이 없거나 권한 문제 → 빈 응답 (graceful)
    return NextResponse.json({ notifications: [], unread_count: 0 }, { status: 200 })
  }

  const { count: unreadCount } = await db
    .from('b2b_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', account.id)
    .is('read_at', null)

  return NextResponse.json({
    notifications: rows ?? [],
    unread_count: unreadCount ?? 0,
  })
}
