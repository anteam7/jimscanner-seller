/**
 * 배대지 양식 변환 평가기 (P1)
 *
 * - 템플릿 컬럼 정의 + 주문/라인/계정/사용자입력 컨텍스트 → 각 컬럼 값
 * - 원본 xlsx 보존, data 영역에만 값 채우기
 * - 합배송 룰 (combine_rule) 에 따라 N개 주문 → 1 파일로 묶음 (v0 미사용)
 *
 * 설계: _memory/p1-forwarder-export-design.md §6, §7
 */

import ExcelJS from 'exceljs'

// ============================================================
// 타입
// ============================================================

export type TemplateColumn = {
  column_index: number
  column_letter: string | null
  column_label: string
  source_kind:
    | 'order_field'
    | 'item_field'
    | 'account_field'
    | 'constant'
    | 'composite'
    | 'user_input'
    | 'order_meta'
  source_path: string | null
  composite_template: string | null
  constant_value: string | null
  user_input_label: string | null
  user_input_options: string[] | null
  transform: string | null
  required: boolean
}

export type Template = {
  id: string
  name: string
  source_file_path: string
  data_sheet_name: string
  data_start_row: number
  combine_rule: string | null
  columns: TemplateColumn[]
}

export type OrderItem = {
  id: string
  display_order: number
  product_name: string
  product_url: string | null
  quantity: number
  currency: string | null
  unit_price_foreign: number | string | null
  total_price_foreign: number | string | null
  weight_kg: number | string | null
  tracking_number: string | null
  supplier_site: string | null
  supplier_order_number: string | null
  supplier_purchased_at: string | null
  sale_price_krw: number | string | null
  market_product_id: string | null
  market_option: string | null
}

export type Order = {
  id: string
  order_number: string
  marketplace: string | null
  market_order_number: string | null
  buyer_name: string | null
  buyer_phone: string | null
  buyer_postal_code: string | null
  buyer_address: string | null
  buyer_detail_address: string | null
  buyer_customs_code: string | null
  request_notes: string | null
  forwarder_id: string | null
  forwarder_country: string | null
  forwarder_request_no: string | null
  estimated_cost_krw: number | string | null
  actual_cost_krw: number | string | null
  created_at: string
  b2b_order_items: OrderItem[]
}

export type Account = {
  id: string
  business_name: string | null
  phone: string | null
  ceo_name?: string | null
}

export type EvaluationContext = {
  order: Order
  item: OrderItem // 라인 단위 — items[0] 가 아니라 현재 row 의 라인
  account: Account
  userInputs: Record<string, string>
}

// ============================================================
// 값 평가 (한 컬럼 + 한 라인)
// ============================================================

export function evaluateColumn(
  col: TemplateColumn,
  ctx: EvaluationContext,
): string | number | null {
  let raw: unknown

  switch (col.source_kind) {
    case 'constant':
      raw = col.constant_value ?? ''
      break
    case 'user_input': {
      const key = col.user_input_label ?? `col_${col.column_index}`
      raw = ctx.userInputs[key]
      if (raw == null || raw === '') {
        raw = col.constant_value ?? ''
      }
      break
    }
    case 'order_field':
      raw = readPath(ctx.order, col.source_path ?? '')
      break
    case 'item_field':
      raw = readItemPath(ctx, col.source_path ?? '')
      break
    case 'account_field':
      raw = readPath(ctx.account, col.source_path ?? '')
      break
    case 'composite':
      raw = renderComposite(col.composite_template ?? '', ctx)
      break
    case 'order_meta':
      raw = readMeta(col.source_path ?? '')
      break
    default:
      raw = ''
  }

  return applyTransform(raw, col.transform)
}

// ============================================================
// path 평가
// ============================================================

// 사용자 입력 path 가 prototype chain 을 타지 못하도록 차단
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** 'buyer_name' / 'forwarders.name' 같은 dot path. prototype 키는 빈 값 처리. */
function readPath(obj: unknown, path: string): unknown {
  if (!path) return ''
  const parts = path.split('.')
  let cur: unknown = obj
  for (const p of parts) {
    if (cur == null) return ''
    if (FORBIDDEN_KEYS.has(p)) return ''
    if (typeof cur !== 'object') return ''
    if (!Object.prototype.hasOwnProperty.call(cur, p)) return ''
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur ?? ''
}

/** 'items[0].product_name' / 'items[N].xxx' — N 은 현재 라인 인덱스로 무시하고 ctx.item 사용 */
function readItemPath(ctx: EvaluationContext, path: string): unknown {
  // path 예: 'items[0].product_name' → field = 'product_name'
  const match = path.match(/^items\[\d+\]\.(.+)$/)
  if (!match) return ''
  return readPath(ctx.item, match[1])
}

/** composite_template 의 {field} placeholder 치환 */
function renderComposite(tpl: string, ctx: EvaluationContext): string {
  return tpl.replace(/\{([^}]+)\}/g, (_, key: string) => {
    // items[N].xxx 형태
    if (key.startsWith('items[')) {
      const v = readItemPath(ctx, key)
      return v == null ? '' : String(v)
    }
    // account.xxx 형태 (수동 분기)
    if (key.startsWith('account.')) {
      const v = readPath(ctx.account, key.slice('account.'.length))
      return v == null ? '' : String(v)
    }
    // 그 외는 order field 로 가정
    const v = readPath(ctx.order, key)
    return v == null ? '' : String(v)
  })
}

function readMeta(path: string): string {
  const now = new Date()
  switch (path) {
    case 'today':
      return now.toISOString().slice(0, 10) // YYYY-MM-DD
    case 'now':
      return now.toISOString()
    default:
      return ''
  }
}

// ============================================================
// transform
// ============================================================

function applyTransform(value: unknown, transform: string | null): string | number | null {
  if (value == null) return ''
  const s = typeof value === 'string' ? value : typeof value === 'number' ? String(value) : String(value)

  switch (transform) {
    case null:
    case undefined:
    case '':
      // 숫자는 숫자로 (엑셀 셀 타입 유지)
      if (typeof value === 'number') return value
      // 문자열이지만 수치만 있는 경우 — 양식에 따라 다르므로 그대로 둠
      return s
    case 'upper':
      return s.toUpperCase()
    case 'lower':
      return s.toLowerCase()
    case 'phone_strip_dash':
      return s.replace(/[^0-9+]/g, '')
    case 'phone_intl':
      // 010-1234-5678 → +82 10 1234 5678
      return s.replace(/^0/, '+82 ').replace(/-/g, ' ')
    case 'krw_format': {
      const n = Number(s.replace(/,/g, ''))
      if (!Number.isFinite(n)) return s
      return new Intl.NumberFormat('en-US').format(n)
    }
    case 'usd_2decimal': {
      const n = Number(s)
      if (!Number.isFinite(n)) return s
      return n.toFixed(2)
    }
    case 'customs_strip_p':
      return s.replace(/^P/i, '')
    case 'alnum_only':
      // 영문/숫자/공백/특수문자 일부만 — 한글 제거
      return s.replace(/[^\x20-\x7E]/g, '').trim()
    default:
      return s
  }
}

// ============================================================
// 합배송 (combine_rule)
// ============================================================

/**
 * 주문 + 라인을 어떻게 row 로 펼칠지 결정.
 * v0 단일 주문 export 의 경우, 각 라인 = 1 row.
 * v0.5 합배송 export 의 경우, combine_rule 에 따라 N개 주문의 라인들을 적절히 묶음.
 */
export function expandRows(
  orders: Order[],
  combineRule: string | null,
): Array<{ order: Order; item: OrderItem }> {
  const rows: Array<{ order: Order; item: OrderItem }> = []

  if (combineRule === 'jimpass_recipient' || combineRule == null) {
    // 단순 펼치기 — 각 주문의 각 라인을 1 row 로
    // 합배송 묶기는 같은 수취인+연락처+우편번호를 인접 배치 (정렬)
    const sorted = [...orders].sort((a, b) => {
      const ka = `${a.buyer_name ?? ''}|${a.buyer_phone ?? ''}|${a.buyer_postal_code ?? ''}`
      const kb = `${b.buyer_name ?? ''}|${b.buyer_phone ?? ''}|${b.buyer_postal_code ?? ''}`
      return ka.localeCompare(kb)
    })
    for (const o of sorted) {
      const items = [...(o.b2b_order_items ?? [])].sort((a, b) => a.display_order - b.display_order)
      for (const item of items) rows.push({ order: o, item })
    }
  } else {
    // 미지원 rule — 단순 펼치기
    for (const o of orders) {
      const items = [...(o.b2b_order_items ?? [])].sort((a, b) => a.display_order - b.display_order)
      for (const item of items) rows.push({ order: o, item })
    }
  }

  return rows
}

// ============================================================
// 누락 경고 (UI 미리보기용)
// ============================================================

export type MissingWarning = {
  column_index: number
  column_label: string
  reason: string
}

export function findMissing(
  columns: TemplateColumn[],
  ctx: EvaluationContext,
): MissingWarning[] {
  const out: MissingWarning[] = []
  for (const c of columns) {
    if (!c.required) continue
    const v = evaluateColumn(c, ctx)
    if (v == null || v === '') {
      out.push({
        column_index: c.column_index,
        column_label: c.column_label,
        reason: '필수 값이 비어 있음',
      })
    }
  }
  return out
}

// ============================================================
// xlsx 채우기 (메인)
// ============================================================

export async function fillTemplate(params: {
  fileBuffer: ArrayBuffer | Buffer
  template: Template
  rows: Array<{ order: Order; item: OrderItem }>
  account: Account
  userInputs: Record<string, string>
}): Promise<Buffer> {
  const { fileBuffer, template, rows, account, userInputs } = params

  const wb = new ExcelJS.Workbook()
  const buf = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer)
  // exceljs 타입 정의가 구버전 Buffer (non-generic) 를 요구. 런타임 호환되므로 any 캐스팅
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buf as any)

  const ws = wb.getWorksheet(template.data_sheet_name)
  if (!ws) {
    throw new Error(`시트 '${template.data_sheet_name}' 를 찾을 수 없습니다`)
  }

  // 컬럼을 column_index 순으로 정렬
  const cols = [...template.columns].sort((a, b) => a.column_index - b.column_index)

  for (let i = 0; i < rows.length; i++) {
    const { order, item } = rows[i]
    const rowNumber = template.data_start_row + i
    const row = ws.getRow(rowNumber)
    const ctx: EvaluationContext = { order, item, account, userInputs }

    for (const c of cols) {
      const value = evaluateColumn(c, ctx)
      const cell = row.getCell(c.column_index)
      cell.value = value as ExcelJS.CellValue
    }
    row.commit()
  }

  const out = await wb.xlsx.writeBuffer()
  return Buffer.from(out)
}
