/**
 * POST /api/form-templates/[id]/fork
 * 공유 (또는 본인) 템플릿을 자기 계정으로 복사. Storage 파일도 복제.
 *
 * 응답: { template_id: <new uuid> }
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!UUID.test(id)) {
    return NextResponse.json({ error: '잘못된 ID' }, { status: 400 })
  }

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  // optional body: { name?: string }
  let body: { name?: string } = {}
  try {
    body = (await request.json().catch(() => ({}))) as { name?: string }
  } catch {
    /* allow empty body */
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adb = admin as any
  const { data: account } = await adb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  // 원본 템플릿 조회
  const { data: src } = await adb
    .from('b2b_form_templates')
    .select('id, owner_account_id, forwarder_id, name, source_file_path, data_sheet_name, data_start_row, header_row_count, combine_rule')
    .eq('id', id)
    .maybeSingle()
  if (!src) return NextResponse.json({ error: '원본 템플릿을 찾을 수 없습니다.' }, { status: 404 })
  // 권한: 공유 (NULL) 또는 본인 소유
  if (src.owner_account_id != null && src.owner_account_id !== account.id) {
    return NextResponse.json({ error: '이 템플릿에 접근 권한이 없습니다.' }, { status: 403 })
  }

  // 원본 컬럼 조회
  const { data: srcCols } = await adb
    .from('b2b_form_template_columns')
    .select('column_index, column_letter, column_label, source_kind, source_path, composite_template, constant_value, user_input_label, user_input_options, transform, required, notes')
    .eq('template_id', id)
    .order('column_index', { ascending: true })
  if (!srcCols || srcCols.length === 0) {
    return NextResponse.json({ error: '원본 템플릿 컬럼이 비어 있습니다.' }, { status: 500 })
  }

  // Storage 파일 복제
  const [bucket, ...rest] = src.source_file_path.split('/')
  const srcObjectPath = rest.join('/')
  const { data: fileBlob, error: dlErr } = await adb.storage.from(bucket).download(srcObjectPath)
  if (dlErr || !fileBlob) {
    return NextResponse.json(
      { error: `원본 파일을 불러오지 못했습니다. ${dlErr?.message ?? ''}` },
      { status: 500 },
    )
  }
  const buf = Buffer.from(await (fileBlob as Blob).arrayBuffer())

  const newTplId = crypto.randomUUID()
  const newStoragePath = `${account.id}/${newTplId}/template.xlsx`
  const newFullPath = `user-templates/${newStoragePath}`
  const { error: upErr } = await adb.storage
    .from('user-templates')
    .upload(newStoragePath, buf, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: false,
    })
  if (upErr) {
    return NextResponse.json({ error: `파일 복제 실패: ${upErr.message}` }, { status: 500 })
  }

  // 새 템플릿 INSERT
  const newName = body.name?.trim() || `${src.name} (복사본)`
  const { error: insErr } = await adb.from('b2b_form_templates').insert({
    id: newTplId,
    owner_account_id: account.id,
    forwarder_id: src.forwarder_id,
    name: newName,
    source_file_path: newFullPath,
    source_file_size: buf.byteLength,
    data_sheet_name: src.data_sheet_name,
    data_start_row: src.data_start_row,
    header_row_count: src.header_row_count,
    combine_rule: src.combine_rule,
    is_active: true,
  })
  if (insErr) {
    await adb.storage.from('user-templates').remove([newStoragePath])
    return NextResponse.json({ error: `템플릿 저장 실패: ${insErr.message}` }, { status: 500 })
  }

  // 컬럼 복제
  type ColRow = {
    column_index: number
    column_letter: string | null
    column_label: string
    source_kind: string
    source_path: string | null
    composite_template: string | null
    constant_value: string | null
    user_input_label: string | null
    user_input_options: string[] | null
    transform: string | null
    required: boolean
    notes: string | null
  }
  const newCols = (srcCols as ColRow[]).map((c) => ({
    template_id: newTplId,
    column_index: c.column_index,
    column_letter: c.column_letter,
    column_label: c.column_label,
    source_kind: c.source_kind,
    source_path: c.source_path,
    composite_template: c.composite_template,
    constant_value: c.constant_value,
    user_input_label: c.user_input_label,
    user_input_options: c.user_input_options,
    transform: c.transform,
    required: c.required,
    notes: c.notes,
  }))
  const { error: colErr } = await adb.from('b2b_form_template_columns').insert(newCols)
  if (colErr) {
    await adb.from('b2b_form_templates').delete().eq('id', newTplId)
    await adb.storage.from('user-templates').remove([newStoragePath])
    return NextResponse.json({ error: `컬럼 복제 실패: ${colErr.message}` }, { status: 500 })
  }

  return NextResponse.json({ template_id: newTplId, name: newName }, { status: 201 })
}
