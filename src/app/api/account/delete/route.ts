import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import { sendAccountDeletedEmail } from '@/lib/b2b/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  let body: { password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const { password } = body
  if (!password) {
    return NextResponse.json({ error: '비밀번호를 입력해 주세요.' }, { status: 400 })
  }

  // 비밀번호 확인
  const { error: signInErr } = await sb.auth.signInWithPassword({
    email: user.email!,
    password,
  })
  if (signInErr) {
    return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { data: account } = await admin
    .from('b2b_accounts')
    .select('id,email,business_name,verification_status,deleted_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!account) return NextResponse.json({ error: '계정을 찾을 수 없습니다.' }, { status: 404 })
  if (account.deleted_at) return NextResponse.json({ error: '이미 탈퇴된 계정입니다.' }, { status: 409 })
  if (account.verification_status === 'suspended') {
    return NextResponse.json({ error: '정지된 계정은 탈퇴할 수 없습니다. 고객센터에 문의해 주세요.' }, { status: 403 })
  }

  const now = new Date().toISOString()

  // ① 활성 구독 즉시 취소
  await admin
    .from('b2b_subscriptions')
    .update({ status: 'cancelled', cancelled_at: now })
    .eq('account_id', account.id)
    .in('status', ['active', 'trial', 'past_due'])

  // ② deleted_at 기록 + deleted_reason='self_requested' + verification_status='deleted'
  const { error: deleteErr } = await admin
    .from('b2b_accounts')
    .update({
      deleted_at: now,
      deleted_reason: 'self_requested',
      verification_status: 'deleted',
    })
    .eq('id', account.id)

  if (deleteErr) {
    return NextResponse.json({ error: '탈퇴 처리 중 오류가 발생했습니다: ' + deleteErr.message }, { status: 500 })
  }

  // ③ Supabase Auth 세션 전체 revoke (재로그인 불가)
  await admin.auth.admin.signOut(user.id, 'global').catch((err: Error) =>
    console.error('[account/delete] 세션 revoke 실패:', err),
  )

  // ④ audit_log
  await admin
    .from('b2b_audit_log')
    .insert({
      account_id: account.id,
      user_id: user.id,
      action: 'account_self_deleted',
      target_type: 'account',
      target_id: account.id,
      metadata: { deleted_at: now, deleted_reason: 'self_requested' },
    })
    .catch((err: Error) => console.error('[account/delete] audit_log 실패:', err))

  // ⑤ 탈퇴 확인 이메일
  await sendAccountDeletedEmail(account.email, account.business_name).catch((err: Error) =>
    console.error('[account/delete] 이메일 발송 실패:', err),
  )

  return NextResponse.json({ ok: true })
}
