/**
 * DELETE /api/forwarder-addresses/[id]
 * PATCH  /api/forwarder-addresses/[id] — is_default 토글 등 부분 수정
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('b2b_forwarder_addresses')
    .delete()
    .eq('id', id)
    .eq('account_id', account.id)
    .eq('is_official', false)
  if (error) return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t) return null
  return t.slice(0, max)
}

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  const admin = createAdminClient()

  // 본인 row 소유권 확인 (is_official=false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: owned } = await (admin as any)
    .from('b2b_forwarder_addresses')
    .select('id')
    .eq('id', id)
    .eq('account_id', account.id)
    .eq('is_official', false)
    .maybeSingle()
  if (!owned) {
    return NextResponse.json({ error: '본인 주소만 수정 가능합니다.' }, { status: 403 })
  }

  // is_default 토글 (단독 호출)
  if (Object.keys(body).length === 1 && 'is_default' in body) {
    if (body.is_default === true) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from('b2b_forwarder_addresses')
        .update({ is_default: false })
        .eq('account_id', account.id)
        .eq('is_default', true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (admin as any)
        .from('b2b_forwarder_addresses')
        .update({ is_default: true })
        .eq('id', id)
        .eq('account_id', account.id)
      if (error) return NextResponse.json({ error: '실패' }, { status: 500 })
    } else if (body.is_default === false) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (admin as any)
        .from('b2b_forwarder_addresses')
        .update({ is_default: false })
        .eq('id', id)
        .eq('account_id', account.id)
      if (error) return NextResponse.json({ error: '실패' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  // 전체 필드 수정
  type Patch = Record<string, string | boolean | null>
  const patch: Patch = {}
  if (isUuid(body.forwarder_id)) patch.forwarder_id = body.forwarder_id as string
  if ('label' in body) {
    const v = str(body.label, 80)
    if (!v) return NextResponse.json({ error: '라벨이 필요합니다.' }, { status: 400 })
    patch.label = v
  }
  if ('recipient_name' in body) {
    const v = str(body.recipient_name, 120)
    if (!v) return NextResponse.json({ error: '수신자명이 필요합니다.' }, { status: 400 })
    patch.recipient_name = v
  }
  if ('phone' in body) patch.phone = str(body.phone, 40)
  if ('address1' in body) {
    const v = str(body.address1, 200)
    if (!v) return NextResponse.json({ error: 'address1 이 필요합니다.' }, { status: 400 })
    patch.address1 = v
  }
  if ('address2' in body) patch.address2 = str(body.address2, 200)
  if ('city' in body) {
    const v = str(body.city, 80)
    if (!v) return NextResponse.json({ error: 'city 가 필요합니다.' }, { status: 400 })
    patch.city = v
  }
  if ('state' in body) {
    const v = str(body.state, 40)
    if (!v) return NextResponse.json({ error: 'state 가 필요합니다.' }, { status: 400 })
    patch.state = v
  }
  if ('zip' in body) {
    const v = str(body.zip, 20)
    if (!v) return NextResponse.json({ error: 'zip 이 필요합니다.' }, { status: 400 })
    patch.zip = v
  }
  if ('country' in body) {
    const v = str(body.country, 4)
    if (!v) return NextResponse.json({ error: 'country 가 필요합니다.' }, { status: 400 })
    patch.country = v.toUpperCase().slice(0, 2)
  }
  if ('member_no' in body) patch.member_no = str(body.member_no, 64)
  if ('notes' in body) patch.notes = str(body.notes, 500)

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '수정할 필드가 없습니다.' }, { status: 400 })
  }
  patch.updated_at = new Date().toISOString()

  // is_default 도 함께 받았다면 처리
  const wantDefault = body.is_default === true
  if (wantDefault) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('b2b_forwarder_addresses')
      .update({ is_default: false })
      .eq('account_id', account.id)
      .eq('is_default', true)
    patch.is_default = true
  } else if (body.is_default === false) {
    patch.is_default = false
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('b2b_forwarder_addresses')
    .update(patch)
    .eq('id', id)
    .eq('account_id', account.id)
  if (error) return NextResponse.json({ error: '수정 실패', detail: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
