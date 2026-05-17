/**
 * PATCH /api/form-templates/[id]/columns — 컬럼 매핑 일괄 업데이트
 *
 * body: { columns: Array<{ column_index, column_label?, source_kind, source_path?, composite_template?, constant_value?, user_input_label?, user_input_options?, transform?, required? }> }
 *
 * 동작: column_index 키로 upsert.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const VALID_SOURCE_KINDS = new Set([
  'order_field',
  'item_field',
  'account_field',
  'constant',
  'composite',
  'user_input',
  'order_meta',
])

type ColumnPatch = {
  column_index: number
  column_label?: string
  source_kind: string
  source_path?: string | null
  composite_template?: string | null
  constant_value?: string | null
  user_input_label?: string | null
  user_input_options?: string[] | null
  transform?: string | null
  required?: boolean
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: '잘못된 ID 형식입니다.' }, { status: 400 })

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  let body: { columns?: ColumnPatch[] } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }
  const cols = Array.isArray(body.columns) ? body.columns : []
  if (cols.length === 0) {
    return NextResponse.json({ error: '컬럼 배열이 비어 있습니다.' }, { status: 400 })
  }

  // 권한 확인
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adb = admin as any
  const { data: account } = await adb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  const { data: tpl } = await adb
    .from('b2b_form_templates')
    .select('id, owner_account_id')
    .eq('id', id)
    .maybeSingle()
  if (!tpl) return NextResponse.json({ error: '템플릿을 찾을 수 없습니다.' }, { status: 404 })
  if (tpl.owner_account_id == null) {
    return NextResponse.json({ error: '공유 템플릿은 수정할 수 없습니다.' }, { status: 403 })
  }
  if (tpl.owner_account_id !== account.id) {
    return NextResponse.json({ error: '이 템플릿에 권한이 없습니다.' }, { status: 403 })
  }

  // 검증 + 정규화
  for (const c of cols) {
    if (!Number.isInteger(c.column_index) || c.column_index < 1) {
      return NextResponse.json(
        { error: `column_index ${c.column_index} 가 올바르지 않습니다.` },
        { status: 400 },
      )
    }
    if (!VALID_SOURCE_KINDS.has(c.source_kind)) {
      return NextResponse.json(
        { error: `source_kind '${c.source_kind}' 가 올바르지 않습니다.` },
        { status: 400 },
      )
    }
    const labelTrim = typeof c.column_label === 'string' ? c.column_label.trim() : ''
    if (!labelTrim) {
      return NextResponse.json(
        { error: `[${c.column_index}열] 헤더 라벨이 비어 있습니다.` },
        { status: 400 },
      )
    }
    c.column_label = labelTrim
  }

  // 기존 컬럼들 조회 → 각 column_index 별 update
  const { data: existing } = await adb
    .from('b2b_form_template_columns')
    .select('id, column_index')
    .eq('template_id', id)

  const existingByIdx = new Map<number, string>()
  for (const e of (existing ?? []) as Array<{ id: string; column_index: number }>) {
    existingByIdx.set(e.column_index, e.id)
  }

  // 순차 update (Postgres unique 충돌 회피)
  for (const c of cols) {
    const eid = existingByIdx.get(c.column_index)
    const patch = {
      column_label: c.column_label,
      source_kind: c.source_kind,
      source_path: c.source_path ?? null,
      composite_template: c.composite_template ?? null,
      constant_value: c.constant_value ?? null,
      user_input_label: c.user_input_label ?? null,
      user_input_options: c.user_input_options ?? null,
      transform: c.transform ?? null,
      required: !!c.required,
    }
    if (eid) {
      const { error } = await adb
        .from('b2b_form_template_columns')
        .update(patch)
        .eq('id', eid)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await adb.from('b2b_form_template_columns').insert({
        template_id: id,
        column_index: c.column_index,
        ...patch,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, updated: cols.length })
}
