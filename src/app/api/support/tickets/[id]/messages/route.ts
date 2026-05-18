/**
 * POST /api/support/tickets/[id]/messages
 * 셀러 답글 추가. 티켓 status='open', last_message_at 갱신.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: ticketId } = await params

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let body: { body?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }
  const text = typeof body.body === 'string' ? body.body.trim() : ''
  if (!text) return NextResponse.json({ error: '내용을 입력해 주세요.' }, { status: 400 })
  if (text.length > 5000) return NextResponse.json({ error: '5000자 이내여야 합니다.' }, { status: 400 })

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
  // 티켓 소유권 확인
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ticket } = await (admin as any)
    .from('b2b_support_tickets')
    .select('id, account_id, status')
    .eq('id', ticketId)
    .eq('account_id', account.id)
    .single()
  if (!ticket) {
    return NextResponse.json({ error: '티켓을 찾을 수 없습니다.' }, { status: 404 })
  }
  if (ticket.status === 'closed') {
    return NextResponse.json({ error: '닫힌 티켓에는 답글을 달 수 없습니다.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: mErr } = await (admin as any)
    .from('b2b_support_messages')
    .insert({ ticket_id: ticketId, sender: 'seller', body: text.slice(0, 5000) })
  if (mErr) {
    return NextResponse.json({ error: '메시지 저장 실패' }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('b2b_support_tickets')
    .update({ status: 'open', last_message_at: now })
    .eq('id', ticketId)

  return NextResponse.json({ ok: true })
}
