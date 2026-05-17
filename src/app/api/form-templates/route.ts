/**
 * POST /api/form-templates — 사용자 정의 양식 업로드
 *
 * FormData:
 *   - file: File (xlsx 또는 xls. xls 는 SheetJS 로 자동 xlsx 변환)
 *   - name: string (양식 이름)
 *   - forwarder_id: string | '' (선택 — 배대지 연결)
 *   - data_sheet_name: string | '' (옵션 — 비면 첫 시트)
 *   - data_start_row: string | '' (옵션 — 비면 2)
 *
 * 동작:
 *  1. file 파싱 → 첫 시트의 첫 행을 헤더로 추출
 *  2. xls 면 xlsx 로 변환
 *  3. Storage user-templates/{account_id}/{template_id}/{filename}.xlsx 업로드
 *  4. b2b_form_templates 행 INSERT (owner = 본인)
 *  5. 헤더마다 b2b_form_template_columns 자동 생성 (source_kind='user_input' default)
 *  6. 응답: { template_id }
 *
 * GET /api/form-templates — 본인 + 공유 양식 목록
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

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
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adb = admin as any
  const { data: rows } = await adb
    .from('b2b_form_templates')
    .select('id, name, owner_account_id, forwarder_id, source_file_path, data_sheet_name, data_start_row, combine_rule, is_active, created_at, updated_at, forwarders(name, slug)')
    .eq('is_active', true)
    .or(`owner_account_id.is.null,owner_account_id.eq.${account.id}`)
    .order('owner_account_id', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false })

  return NextResponse.json({ templates: rows ?? [] })
}

export async function POST(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const file = form.get('file')
  const name = (form.get('name') as string | null)?.trim() ?? ''
  const forwarderIdRaw = (form.get('forwarder_id') as string | null)?.trim() ?? ''
  const forwarder_id = forwarderIdRaw || null
  const dataSheetOverride = (form.get('data_sheet_name') as string | null)?.trim() ?? ''
  const dataStartRowOverride = Number((form.get('data_start_row') as string | null) ?? '')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: '파일을 첨부해주세요.' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: '양식 이름을 입력해주세요.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '파일은 최대 5MB 까지 가능합니다.' }, { status: 400 })
  }

  const lowered = file.name.toLowerCase()
  const isXls = lowered.endsWith('.xls')
  const isXlsx = lowered.endsWith('.xlsx')
  if (!isXls && !isXlsx) {
    return NextResponse.json({ error: 'xlsx 또는 xls 파일만 업로드 가능합니다.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  const ab = await file.arrayBuffer()
  let xlsxBuffer: Buffer
  let sheetNames: string[]
  let headers: string[]
  let pickedSheet: string

  try {
    // SheetJS 로 일단 파싱 (xls/xlsx 모두 처리 가능)
    const wb = XLSX.read(new Uint8Array(ab), { type: 'array' })
    sheetNames = wb.SheetNames
    if (sheetNames.length === 0) {
      return NextResponse.json({ error: '시트가 없습니다.' }, { status: 400 })
    }
    pickedSheet =
      dataSheetOverride && sheetNames.includes(dataSheetOverride)
        ? dataSheetOverride
        : sheetNames[0]
    const ws = wb.Sheets[pickedSheet]
    if (!ws || !ws['!ref']) {
      return NextResponse.json({ error: '시트가 비어 있습니다.' }, { status: 400 })
    }
    const range = XLSX.utils.decode_range(ws['!ref'])
    headers = []
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: range.s.r, c })
      const cell = ws[addr]
      const label =
        cell && (cell.v != null ? String(cell.v).trim() : '') ? String(cell.v).trim() : ''
      if (label) headers.push(label)
      else break // 빈 칸 만나면 종료 — 양식 끝
    }
    if (headers.length === 0) {
      return NextResponse.json({ error: '첫 행에서 헤더를 읽지 못했습니다.' }, { status: 400 })
    }

    if (isXls) {
      // xls → xlsx 변환 후 셀러 양식의 헤더 보존을 위해 SheetJS write
      // bookType=xlsx 로 출력
      const arrBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      xlsxBuffer = Buffer.from(new Uint8Array(arrBuf))
    } else {
      xlsxBuffer = Buffer.from(new Uint8Array(ab))
    }

    // 검증: exceljs 로 다시 읽어 호환되는지 확인 (export API 와 같은 라이브러리)
    const wb2 = new ExcelJS.Workbook()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb2.xlsx.load(xlsxBuffer as any)
    const ws2 = wb2.getWorksheet(pickedSheet)
    if (!ws2) {
      return NextResponse.json(
        { error: `시트 '${pickedSheet}' 가 변환 후 사라졌습니다. 다른 파일을 시도해주세요.` },
        { status: 400 },
      )
    }
  } catch (e) {
    return NextResponse.json(
      { error: `파일 파싱 실패: ${e instanceof Error ? e.message : String(e)}` },
      { status: 400 },
    )
  }

  // template id 미리 생성 (Storage path 에 사용)
  const templateId = crypto.randomUUID()
  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/\.xls$/i, '.xlsx')
  const storagePath = `${account.id}/${templateId}/${safeFilename}`
  const fullPath = `user-templates/${storagePath}`

  // Storage 업로드 (service_role)
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adb = admin as any
  const { error: upErr } = await adb.storage
    .from('user-templates')
    .upload(storagePath, xlsxBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: false,
    })
  if (upErr) {
    return NextResponse.json(
      { error: `파일 업로드 실패: ${upErr.message}` },
      { status: 500 },
    )
  }

  // 템플릿 INSERT
  const dataStartRow = Number.isFinite(dataStartRowOverride) && dataStartRowOverride > 0
    ? Math.floor(dataStartRowOverride)
    : 2

  const { error: insErr } = await adb.from('b2b_form_templates').insert({
    id: templateId,
    owner_account_id: account.id,
    forwarder_id,
    name,
    source_file_path: fullPath,
    source_file_size: xlsxBuffer.byteLength,
    data_sheet_name: pickedSheet,
    data_start_row: dataStartRow,
    header_row_count: 1,
    combine_rule: null,
    is_active: true,
  })
  if (insErr) {
    // Storage cleanup best-effort
    await adb.storage.from('user-templates').remove([storagePath])
    return NextResponse.json({ error: `템플릿 저장 실패: ${insErr.message}` }, { status: 500 })
  }

  // 컬럼 자동 생성 — 모두 user_input 으로 시작, 사용자가 매핑 에디터에서 변경
  const A = 'A'.charCodeAt(0)
  const colRows = headers.map((label, idx) => ({
    template_id: templateId,
    column_index: idx + 1,
    column_letter:
      idx < 26 ? String.fromCharCode(A + idx) : `A${String.fromCharCode(A + idx - 26)}`,
    column_label: label,
    source_kind: 'user_input',
    user_input_label: label,
    required: false,
  }))

  const { error: colErr } = await adb.from('b2b_form_template_columns').insert(colRows)
  if (colErr) {
    await adb.from('b2b_form_templates').delete().eq('id', templateId)
    await adb.storage.from('user-templates').remove([storagePath])
    return NextResponse.json({ error: `컬럼 저장 실패: ${colErr.message}` }, { status: 500 })
  }

  return NextResponse.json({ template_id: templateId, columns: headers.length, sheet: pickedSheet, sheets: sheetNames }, { status: 201 })
}
