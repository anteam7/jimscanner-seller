import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  let body: { current_password?: string; new_password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const { current_password, new_password } = body

  if (!current_password || !new_password) {
    return NextResponse.json({ error: '현재 비밀번호와 새 비밀번호를 모두 입력해 주세요.' }, { status: 400 })
  }

  if (new_password.length < 8) {
    return NextResponse.json({ error: '새 비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })
  }

  if (current_password === new_password) {
    return NextResponse.json({ error: '새 비밀번호가 현재 비밀번호와 동일합니다.' }, { status: 400 })
  }

  // 현재 비밀번호 검증: signInWithPassword 시도
  const { error: signInErr } = await sb.auth.signInWithPassword({
    email: user.email!,
    password: current_password,
  })

  if (signInErr) {
    return NextResponse.json({ error: '현재 비밀번호가 일치하지 않습니다.' }, { status: 400 })
  }

  // 비밀번호 변경
  const { error: updateErr } = await sb.auth.updateUser({ password: new_password })
  if (updateErr) {
    return NextResponse.json({ error: '비밀번호 변경 중 오류가 발생했습니다: ' + updateErr.message }, { status: 500 })
  }

  // 타 기기 세션 무효화 — 계정 탈취 후 기존 세션 차단
  await sb.auth.signOut({ scope: 'others' })

  // audit_log
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = await (admin as any)
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (account) {
    await (admin as any).from('b2b_audit_log').insert({
      account_id: account.id,
      user_id: user.id,
      action: 'password_changed',
      target_type: 'account',
      target_id: account.id,
      metadata: { changed_at: new Date().toISOString(), sessions_invalidated: true },
    })
  }

  return NextResponse.json({ ok: true })
}
