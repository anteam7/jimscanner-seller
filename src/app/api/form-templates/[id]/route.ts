/**
 * PATCH /api/form-templates/[id] — 메타 수정 (name / forwarder_id / data_start_row / combine_rule / is_active)
 * DELETE /api/form-templates/[id] — 삭제 (Storage 파일 + DB row)
 *
 * 공유 템플릿(owner_account_id IS NULL)은 셀러가 수정·삭제 불가.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function getOwnedTemplate(id: string, userId: string) {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adb = admin as any
  const { data: account } = await adb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', userId)
    .single()
  if (!account) return { error: '사업자 계정이 없습니다.', status: 404 as const }
  const { data: tpl } = await adb
    .from('b2b_form_templates')
    .select('id, owner_account_id, source_file_path')
    .eq('id', id)
    .maybeSingle()
  if (!tpl) return { error: '템플릿을 찾을 수 없습니다.', status: 404 as const }
  if (tpl.owner_account_id == null) {
    return { error: '공유 템플릿은 수정할 수 없습니다.', status: 403 as const }
  }
  if (tpl.owner_account_id !== account.id) {
    return { error: '이 템플릿에 권한이 없습니다.', status: 403 as const }
  }
  return { adb, tpl, account }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!UUID.test(id)) {
    return NextResponse.json({ error: '잘못된 ID 형식입니다.' }, { status: 400 })
  }

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const ctx = await getOwnedTemplate(id, user.id)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const patch: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim()
  if (typeof body.forwarder_id === 'string' || body.forwarder_id === null) {
    patch.forwarder_id = body.forwarder_id || null
  }
  if (typeof body.data_start_row === 'number' && body.data_start_row > 0) {
    patch.data_start_row = Math.floor(body.data_start_row)
  }
  if (typeof body.combine_rule === 'string' || body.combine_rule === null) {
    patch.combine_rule = body.combine_rule || null
  }
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '변경할 필드가 없습니다.' }, { status: 400 })
  }

  const { error } = await ctx.adb.from('b2b_form_templates').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!UUID.test(id)) {
    return NextResponse.json({ error: '잘못된 ID 형식입니다.' }, { status: 400 })
  }

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const ctx = await getOwnedTemplate(id, user.id)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  // Storage 삭제 (best effort)
  const fullPath = ctx.tpl.source_file_path as string
  const [bucket, ...rest] = fullPath.split('/')
  await ctx.adb.storage.from(bucket).remove([rest.join('/')])

  const { error } = await ctx.adb.from('b2b_form_templates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
