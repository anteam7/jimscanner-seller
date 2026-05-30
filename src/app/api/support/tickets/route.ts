/**
 * POST /api/support/tickets
 * 새 티켓 + 첫 메시지 생성.
 * Body: { subject, category, body }
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_CATEGORIES = ['general', 'billing', 'technical', 'account', 'other']

export async function POST(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let body: { subject?: unknown; category?: unknown; body?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const messageBody = typeof body.body === 'string' ? body.body.trim() : ''
  const category = typeof body.category === 'string' && VALID_CATEGORIES.includes(body.category)
    ? body.category
    : 'general'

  if (!subject) return NextResponse.json({ error: '제목을 입력해 주세요.' }, { status: 400 })
  if (subject.length > 200) return NextResponse.json({ error: '제목은 200자 이내여야 합니다.' }, { status: 400 })
  if (!messageBody) return NextResponse.json({ error: '문의 내용을 입력해 주세요.' }, { status: 400 })
  if (messageBody.length > 5000) return NextResponse.json({ error: '내용은 5000자 이내여야 합니다.' }, { status: 400 })

  const db = sb
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) {
    return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })
  }

  const admin = createAdminClient()
  const { data: ticket, error: tErr } = await admin
    .from('b2b_support_tickets')
    .insert({
      account_id: account.id,
      subject: subject.slice(0, 200),
      category,
      status: 'open',
      last_message_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (tErr || !ticket) {
    return NextResponse.json({ error: '티켓 생성 실패' }, { status: 500 })
  }

  const { error: mErr } = await admin
    .from('b2b_support_messages')
    .insert({
      ticket_id: ticket.id,
      sender: 'seller',
      body: messageBody.slice(0, 5000),
    })
  if (mErr) {
    // rollback
    await admin.from('b2b_support_tickets').delete().eq('id', ticket.id)
    return NextResponse.json({ error: '메시지 저장 실패' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: ticket.id })
}
