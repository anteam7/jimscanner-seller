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
    .select('id, email, phone, postal_code, address, detail_address, business_name, ceo_name')
    .eq('user_id', user.id)
    .single()

  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  return NextResponse.json({
    email: user.email ?? account.email,
    phone: account.phone ?? '',
    postal_code: account.postal_code ?? '',
    address: account.address ?? '',
    detail_address: account.detail_address ?? '',
    business_name: account.business_name ?? '',
    ceo_name: account.ceo_name ?? '',
  })
}

export async function PATCH(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  let body: {
    phone?: string
    postal_code?: string
    address?: string
    detail_address?: string
    email?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const { phone, postal_code, address, detail_address, email } = body

  if (phone === undefined && postal_code === undefined && address === undefined && detail_address === undefined && email === undefined) {
    return NextResponse.json({ error: '변경할 항목이 없습니다.' }, { status: 400 })
  }

  // 전화번호 형식 기본 검증
  if (phone !== undefined && phone !== '' && !/^[\d\-+() ]{7,20}$/.test(phone)) {
    return NextResponse.json({ error: '전화번호 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any

  const { data: account } = await db
    .from('b2b_accounts')
    .select('id, email')
    .eq('user_id', user.id)
    .single()

  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  // 이메일 변경: Supabase Auth admin 경유 (확인 이메일 자동 발송)
  if (email !== undefined && email !== user.email) {
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: '올바른 이메일 주소를 입력해 주세요.' }, { status: 400 })
    }
    const { error: emailErr } = await (admin as any).auth.admin.updateUserById(user.id, {
      email,
    })
    if (emailErr) {
      return NextResponse.json({ error: '이메일 변경 요청 중 오류가 발생했습니다: ' + emailErr.message }, { status: 500 })
    }
    // b2b_audit_log: email 변경 요청
    await (admin as any).from('b2b_audit_log').insert({
      account_id: account.id,
      user_id: user.id,
      action: 'account_info_updated',
      target_type: 'account',
      target_id: account.id,
      metadata: { field: 'email', old_value_masked: account.email?.replace(/(.{2}).+(@.+)/, '$1***$2'), changed_at: new Date().toISOString() },
    })
  }

  // b2b_accounts 업데이트 (phone, postal_code, address, detail_address)
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const changedFields: string[] = []
  if (phone !== undefined) { updates.phone = phone || null; changedFields.push('phone') }
  if (postal_code !== undefined) { updates.postal_code = postal_code || null; changedFields.push('postal_code') }
  if (address !== undefined) { updates.address = address || null; changedFields.push('address') }
  if (detail_address !== undefined) { updates.detail_address = detail_address || null; changedFields.push('detail_address') }

  if (changedFields.length > 0) {
    const { error: updateErr } = await (admin as any)
      .from('b2b_accounts')
      .update(updates)
      .eq('id', account.id)

    if (updateErr) return NextResponse.json({ error: '저장 중 오류가 발생했습니다.' }, { status: 500 })

    await (admin as any).from('b2b_audit_log').insert({
      account_id: account.id,
      user_id: user.id,
      action: 'account_info_updated',
      target_type: 'account',
      target_id: account.id,
      metadata: { fields: changedFields, changed_at: new Date().toISOString() },
    })
  }

  return NextResponse.json({ ok: true, email_change_pending: email !== undefined && email !== user.email })
}
