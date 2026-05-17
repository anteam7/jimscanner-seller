/**
 * POST /api/orders/export-bulk
 * 여러 주문을 1개 배대지 양식 xlsx 로 묶어서 변환 (합배송).
 *
 * body: { template_id: string, order_ids: string[], user_inputs?: Record<string,string> }
 *
 * - combine_rule 에 따라 같은 수취인끼리 인접 배치 (expandRows)
 * - 최대 100건 (양식 row 폭증 방지)
 * - 모든 order_id 가 본인 소유 + 활성 인지 검증
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import {
  fillTemplate,
  expandRows,
  type Template,
  type Order,
  type Account,
  type TemplateColumn,
} from '@/lib/b2b/forwarder-export'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_ORDERS = 100
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ORDER_COLUMNS =
  'id, order_number, marketplace, market_order_number, buyer_name, buyer_phone, buyer_postal_code, buyer_address, buyer_detail_address, buyer_customs_code, request_notes, forwarder_id, forwarder_country, forwarder_request_no, estimated_cost_krw, actual_cost_krw, created_at, ' +
  'b2b_order_items(id, display_order, product_name, product_url, quantity, currency, unit_price_foreign, total_price_foreign, weight_kg, tracking_number, supplier_site, supplier_order_number, supplier_purchased_at, sale_price_krw, market_product_id, market_option)'

export async function POST(request: Request) {
  let body: {
    template_id?: string
    order_ids?: string[]
    user_inputs?: Record<string, string>
  } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const templateId = body.template_id ?? ''
  const orderIds = Array.isArray(body.order_ids) ? body.order_ids : []
  const userInputs = body.user_inputs ?? {}

  if (!UUID.test(templateId)) {
    return NextResponse.json({ error: 'template_id 가 필요합니다.' }, { status: 400 })
  }
  if (orderIds.length === 0) {
    return NextResponse.json({ error: '주문을 1건 이상 선택해주세요.' }, { status: 400 })
  }
  if (orderIds.length > MAX_ORDERS) {
    return NextResponse.json(
      { error: `한 번에 최대 ${MAX_ORDERS}건까지 처리 가능합니다.` },
      { status: 400 },
    )
  }
  for (const id of orderIds) {
    if (!UUID.test(id)) {
      return NextResponse.json({ error: `주문 ID '${id}' 형식이 잘못되었습니다.` }, { status: 400 })
    }
  }

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id, business_name, phone')
    .eq('user_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  // 주문 일괄 조회 (RLS)
  const { data: orders, error: orderErr } = await db
    .from('b2b_orders')
    .select(ORDER_COLUMNS)
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .in('id', orderIds)

  if (orderErr) {
    return NextResponse.json({ error: `주문 조회 실패: ${orderErr.message}` }, { status: 500 })
  }
  const orderRows = (orders ?? []) as Order[]
  if (orderRows.length === 0) {
    return NextResponse.json({ error: '선택한 주문을 찾을 수 없습니다.' }, { status: 404 })
  }
  if (orderRows.length !== orderIds.length) {
    const found = new Set(orderRows.map((o) => o.id))
    const missing = orderIds.filter((id) => !found.has(id))
    return NextResponse.json(
      { error: `일부 주문에 접근할 수 없습니다 (${missing.length}건).` },
      { status: 403 },
    )
  }

  // 템플릿 + 컬럼 (admin — 공유 템플릿 SELECT 보장)
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adb = admin as any
  const { data: tpl } = await adb
    .from('b2b_form_templates')
    .select('id, owner_account_id, name, source_file_path, data_sheet_name, data_start_row, combine_rule, is_active')
    .eq('id', templateId)
    .maybeSingle()

  if (!tpl || !tpl.is_active) {
    return NextResponse.json({ error: '템플릿을 찾을 수 없습니다.' }, { status: 404 })
  }
  if (tpl.owner_account_id != null && tpl.owner_account_id !== account.id) {
    return NextResponse.json({ error: '이 템플릿에 접근 권한이 없습니다.' }, { status: 403 })
  }

  const { data: cols } = await adb
    .from('b2b_form_template_columns')
    .select('column_index, column_letter, column_label, source_kind, source_path, composite_template, constant_value, user_input_label, user_input_options, transform, required')
    .eq('template_id', tpl.id)
    .order('column_index', { ascending: true })

  if (!cols || cols.length === 0) {
    return NextResponse.json({ error: '템플릿 컬럼 매핑이 비어 있습니다.' }, { status: 500 })
  }

  // Storage 에서 원본 xlsx 다운로드
  const [bucket, ...rest] = tpl.source_file_path.split('/')
  const objectPath = rest.join('/')
  const { data: fileBlob, error: dlErr } = await adb.storage.from(bucket).download(objectPath)
  if (dlErr || !fileBlob) {
    return NextResponse.json(
      { error: `템플릿 원본 파일을 불러오지 못했습니다. ${dlErr?.message ?? ''}` },
      { status: 500 },
    )
  }
  const fileBuffer = await (fileBlob as Blob).arrayBuffer()

  const template: Template = {
    id: tpl.id,
    name: tpl.name,
    source_file_path: tpl.source_file_path,
    data_sheet_name: tpl.data_sheet_name,
    data_start_row: tpl.data_start_row,
    combine_rule: tpl.combine_rule,
    columns: cols as TemplateColumn[],
  }

  const rows = expandRows(orderRows, template.combine_rule)
  if (rows.length === 0) {
    return NextResponse.json({ error: '내보낼 라인 아이템이 없습니다.' }, { status: 400 })
  }

  const out = await fillTemplate({
    fileBuffer,
    template,
    rows,
    account: account as Account,
    userInputs,
  })

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const safeName = template.name.replace(/[^\p{L}\p{N}._-]+/gu, '_')
  const filename = `${safeName}_${orderRows.length}건_${today}.xlsx`

  return new NextResponse(new Uint8Array(out), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
      'X-Order-Count': String(orderRows.length),
      'X-Row-Count': String(rows.length),
    },
  })
}
