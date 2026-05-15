import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any

  const { data: account } = await db
    .from('b2b_accounts')
    .select('id, withdrawal_notice_enabled, withdrawal_notice_custom_text')
    .eq('user_id', user.id)
    .single()

  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: notices } = await db
    .from('b2b_withdrawal_notices')
    .select('delivery_status')
    .eq('account_id', account.id)
    .gte('sent_at', since30d)

  const total = notices?.length ?? 0
  const sent = notices?.filter((n: { delivery_status: string }) => n.delivery_status === 'sent').length ?? 0

  return NextResponse.json({
    withdrawal_notice_enabled: account.withdrawal_notice_enabled ?? true,
    withdrawal_notice_custom_text: account.withdrawal_notice_custom_text ?? '',
    stats: {
      total_30d: total,
      sent_30d: sent,
      success_rate: total > 0 ? Math.round((sent / total) * 100) : null,
    },
  })
}

export async function PATCH(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  let body: { withdrawal_notice_enabled?: boolean; withdrawal_notice_custom_text?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const { withdrawal_notice_enabled, withdrawal_notice_custom_text } = body

  if (typeof withdrawal_notice_enabled !== 'boolean' && withdrawal_notice_custom_text === undefined) {
    return NextResponse.json({ error: '변경할 항목이 없습니다.' }, { status: 400 })
  }

  // 전자상거래법 §17 청약철회 고지는 법정 의무 — 비활성화 불가
  if (withdrawal_notice_enabled === false) {
    return NextResponse.json(
      { error: '청약철회 고지는 전자상거래법 §17에 따른 법정 의무로 비활성화할 수 없습니다.' },
      { status: 400 },
    )
  }

  if (
    withdrawal_notice_custom_text !== undefined &&
    withdrawal_notice_custom_text.trim() === ''
  ) {
    return NextResponse.json({ error: '커스텀 문구는 빈 칸일 수 없습니다. 기본값 사용 시 필드를 삭제해 주세요.' }, { status: 400 })
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any

  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof withdrawal_notice_enabled === 'boolean') updates.withdrawal_notice_enabled = withdrawal_notice_enabled
  if (withdrawal_notice_custom_text !== undefined) updates.withdrawal_notice_custom_text = withdrawal_notice_custom_text || null

  const { error: updateErr } = await (admin as any)
    .from('b2b_accounts')
    .update(updates)
    .eq('id', account.id)

  if (updateErr) return NextResponse.json({ error: '저장 중 오류가 발생했습니다.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
