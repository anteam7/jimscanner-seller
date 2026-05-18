/**
 * POST /api/seller-tokens — 새 토큰 발급 (raw 토큰은 응답 1회만 반환).
 * DELETE /api/seller-tokens?id=... — 토큰 revoke.
 *
 * 인증: 셀러 로그인 세션 (Supabase auth.uid()).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import { generateRawToken } from '@/lib/b2b/seller-tokens'

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

  let body: { label?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    // 본문 비어도 OK
  }
  const label =
    typeof body.label === 'string' && body.label.trim()
      ? body.label.trim().slice(0, 80)
      : 'browser-extension'

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

  const { raw, hash, prefix } = generateRawToken()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from('b2b_seller_tokens')
    .insert({
      account_id: account.id,
      label,
      token_hash: hash,
      token_prefix: prefix,
    })
    .select('id, label, token_prefix, created_at')
    .single()

  if (error || !row) {
    return NextResponse.json({ error: '토큰 발급 실패' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    token: raw, // 1회만 노출
    id: row.id,
    label: row.label,
    prefix: row.token_prefix,
    created_at: row.created_at,
  })
}

export async function DELETE(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id 가 필요합니다.' }, { status: 400 })
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
    .from('b2b_seller_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('account_id', account.id)
  if (error) {
    return NextResponse.json({ error: 'revoke 실패' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
