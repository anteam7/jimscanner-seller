'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

// ============================================================
// 미리보기용 데이터 + 평가기 (서버 forwarder-export.ts 와 동일 로직, ts-only)
// ============================================================

export type SampleAccount = {
  business_name: string | null
  phone: string | null
}

export type SampleOrderItem = {
  display_order: number
  product_name: string
  product_url: string | null
  quantity: number
  currency: string | null
  unit_price_foreign: number | string | null
  total_price_foreign: number | string | null
  weight_kg: number | string | null
  supplier_site: string | null
  supplier_order_number: string | null
  market_product_id: string | null
  market_option: string | null
  tracking_number: string | null
}

export type SampleOrder = {
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
  forwarder_country: string | null
  forwarder_request_no: string | null
  b2b_order_items: SampleOrderItem[] | null
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

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

function readItemPath(item: SampleOrderItem | null, path: string): unknown {
  const m = path.match(/^items\[\d+\]\.(.+)$/)
  if (!m || !item) return ''
  return readPath(item, m[1])
}

function renderComposite(
  tpl: string,
  order: SampleOrder,
  item: SampleOrderItem | null,
  account: SampleAccount,
): string {
  return tpl.replace(/\{([^}]+)\}/g, (_, key: string) => {
    if (key.startsWith('items[')) {
      const v = readItemPath(item, key)
      return v == null ? '' : String(v)
    }
    if (key.startsWith('account.')) {
      const v = readPath(account, key.slice('account.'.length))
      return v == null ? '' : String(v)
    }
    const v = readPath(order, key)
    return v == null ? '' : String(v)
  })
}

function applyTransform(value: unknown, transform: string | null): string | number {
  if (value == null || value === '') return ''
  const s = typeof value === 'number' ? String(value) : String(value)
  switch (transform) {
    case null:
    case undefined:
    case '':
      return typeof value === 'number' ? value : s
    case 'upper': return s.toUpperCase()
    case 'lower': return s.toLowerCase()
    case 'phone_strip_dash': return s.replace(/[^0-9+]/g, '')
    case 'phone_intl': return s.replace(/^0/, '+82 ').replace(/-/g, ' ')
    case 'krw_format': {
      const n = Number(s.replace(/,/g, ''))
      return Number.isFinite(n) ? new Intl.NumberFormat('en-US').format(n) : s
    }
    case 'usd_2decimal': {
      const n = Number(s)
      return Number.isFinite(n) ? n.toFixed(2) : s
    }
    case 'customs_strip_p': return s.replace(/^P/i, '')
    case 'alnum_only': return s.replace(/[^\x20-\x7E]/g, '').trim()
    default: return s
  }
}

function evaluateColumn(
  c: EditorColumn,
  order: SampleOrder | null,
  item: SampleOrderItem | null,
  account: SampleAccount,
): string | number {
  if (!order) return ''
  let raw: unknown
  switch (c.source_kind) {
    case 'constant':
      raw = c.constant_value ?? ''
      break
    case 'user_input':
      raw = c.constant_value ?? '' // 미리보기에서는 default 만
      break
    case 'order_field':
      raw = readPath(order, c.source_path ?? '')
      break
    case 'item_field':
      raw = readItemPath(item, c.source_path ?? '')
      break
    case 'account_field':
      raw = readPath(account, c.source_path ?? '')
      break
    case 'composite':
      raw = renderComposite(c.composite_template ?? '', order, item, account)
      break
    case 'order_meta':
      if (c.source_path === 'today') raw = new Date().toISOString().slice(0, 10)
      else if (c.source_path === 'now') raw = new Date().toISOString()
      else raw = ''
      break
    default:
      raw = ''
  }
  return applyTransform(raw, c.transform)
}

export type EditorColumn = {
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
}

export type EditorForwarder = { id: string; name: string }

const SOURCE_KINDS: { value: string; label: string }[] = [
  { value: 'user_input', label: '사용자 입력' },
  { value: 'order_field', label: '주문 필드' },
  { value: 'item_field', label: '상품(라인) 필드' },
  { value: 'account_field', label: '사업자 정보' },
  { value: 'composite', label: '합성 (여러 필드)' },
  { value: 'constant', label: '고정 값' },
  { value: 'order_meta', label: '메타 (오늘 날짜 등)' },
]

const ORDER_FIELDS: { value: string; label: string }[] = [
  { value: 'order_number', label: '셀러 내부 주문번호 (order_number)' },
  { value: 'market_order_number', label: '마켓 주문번호' },
  { value: 'marketplace', label: '마켓 코드 (coupang 등)' },
  { value: 'buyer_name', label: '수취인명 (buyer_name)' },
  { value: 'buyer_phone', label: '수취인 전화 (buyer_phone)' },
  { value: 'buyer_postal_code', label: '우편번호 (buyer_postal_code)' },
  { value: 'buyer_address', label: '주소 (buyer_address)' },
  { value: 'buyer_detail_address', label: '상세주소 (buyer_detail_address)' },
  { value: 'buyer_customs_code', label: '개인통관코드 (buyer_customs_code)' },
  { value: 'request_notes', label: '구매자 요청 메모 (request_notes)' },
  { value: 'forwarder_country', label: '배대지 국가 (forwarder_country)' },
  { value: 'forwarder_request_no', label: '배대지 신청번호 (forwarder_request_no)' },
]

const ITEM_FIELDS: { value: string; label: string }[] = [
  { value: 'items[0].product_name', label: '상품명 (product_name)' },
  { value: 'items[0].quantity', label: '수량 (quantity)' },
  { value: 'items[0].currency', label: '통화 (currency)' },
  { value: 'items[0].unit_price_foreign', label: '해외 단가 (unit_price_foreign)' },
  { value: 'items[0].total_price_foreign', label: '해외 합계 (total_price_foreign)' },
  { value: 'items[0].product_url', label: '상품 URL (product_url)' },
  { value: 'items[0].weight_kg', label: '중량 kg (weight_kg)' },
  { value: 'items[0].supplier_site', label: '매입 사이트 (supplier_site)' },
  { value: 'items[0].supplier_order_number', label: '현지 주문번호 (supplier_order_number)' },
  { value: 'items[0].market_option', label: '마켓 옵션 (market_option)' },
  { value: 'items[0].market_product_id', label: '마켓 상품 ID (market_product_id)' },
  { value: 'items[0].tracking_number', label: '운송장 (tracking_number)' },
]

const ACCOUNT_FIELDS: { value: string; label: string }[] = [
  { value: 'business_name', label: '사업자명 (business_name)' },
  { value: 'phone', label: '사업자 전화 (phone)' },
]

const META_FIELDS: { value: string; label: string }[] = [
  { value: 'today', label: '오늘 (YYYY-MM-DD)' },
  { value: 'now', label: '현재 시각 (ISO)' },
]

const TRANSFORMS: { value: string; label: string }[] = [
  { value: '', label: '없음' },
  { value: 'upper', label: '영문 대문자' },
  { value: 'lower', label: '영문 소문자' },
  { value: 'phone_strip_dash', label: '전화 - 제거' },
  { value: 'phone_intl', label: '전화 → +82 형식' },
  { value: 'krw_format', label: 'KRW 1,000 포맷' },
  { value: 'usd_2decimal', label: '소수 2자리 (45.99)' },
  { value: 'customs_strip_p', label: '통관코드 P 제거' },
  { value: 'alnum_only', label: '한글 제거 (영문/숫자만)' },
]

type Props = {
  templateId: string
  templateName: string
  forwarderId: string | null
  forwarders: EditorForwarder[]
  initialColumns: EditorColumn[]
  sampleOrder?: SampleOrder | null
  sampleAccount?: SampleAccount
}

export default function TemplateMappingEditor({
  templateId,
  templateName,
  forwarderId,
  forwarders,
  initialColumns,
  sampleOrder = null,
  sampleAccount = { business_name: null, phone: null },
}: Props) {
  const router = useRouter()
  const [name, setName] = useState(templateName)
  const [fid, setFid] = useState<string>(forwarderId ?? '')
  const [columns, setColumns] = useState<EditorColumn[]>(initialColumns)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const metaChanged = useMemo(
    () => name !== templateName || (fid || null) !== (forwarderId ?? null),
    [name, fid, templateName, forwarderId],
  )

  // 미리보기용 첫 라인 (display_order asc)
  const sampleItem = useMemo<SampleOrderItem | null>(() => {
    if (!sampleOrder?.b2b_order_items?.length) return null
    return [...sampleOrder.b2b_order_items].sort(
      (a, b) => a.display_order - b.display_order,
    )[0]
  }, [sampleOrder])

  function patchCol(idx: number, p: Partial<EditorColumn>) {
    setColumns((prev) => prev.map((c, i) => (i === idx ? { ...c, ...p } : c)))
  }

  async function onSave() {
    // 클라이언트 검증
    if (!name.trim()) {
      setMsg({ kind: 'err', text: '양식 이름을 입력해주세요.' })
      return
    }
    const emptyLabel = columns.find((c) => !c.column_label.trim())
    if (emptyLabel) {
      setMsg({
        kind: 'err',
        text: `[${emptyLabel.column_letter ?? emptyLabel.column_index}열] 헤더 라벨을 입력해주세요.`,
      })
      return
    }

    setSaving(true)
    setMsg(null)
    try {
      // 1. 메타 (name / forwarder) — 변경된 경우에만
      if (metaChanged) {
        const res = await fetch(`/api/form-templates/${templateId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            forwarder_id: fid || null,
          }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error ?? `메타 저장 실패 (${res.status})`)
        }
      }
      // 2. 컬럼
      const payload = {
        columns: columns.map((c) => ({
          column_index: c.column_index,
          column_label: c.column_label.trim(),
          source_kind: c.source_kind,
          source_path: c.source_path || null,
          composite_template: c.composite_template || null,
          constant_value: c.constant_value ?? null,
          user_input_label: c.user_input_label || null,
          user_input_options: c.user_input_options ?? null,
          transform: c.transform || null,
          required: c.required,
        })),
      }
      const res2 = await fetch(`/api/form-templates/${templateId}/columns`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res2.ok) {
        const j = await res2.json().catch(() => ({}))
        throw new Error(j.error ?? `컬럼 저장 실패 (${res2.status})`)
      }
      setMsg({ kind: 'ok', text: '저장되었습니다.' })
      router.refresh()
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '저장 실패' })
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!confirm(`'${templateName}' 양식을 삭제할까요? 이 양식을 사용 중인 주문은 영향이 없지만, 더 이상 다운로드에 사용할 수 없습니다.`)) {
      return
    }
    setDeleting(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/form-templates/${templateId}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `삭제 실패 (${res.status})`)
      }
      router.push('/templates')
      router.refresh()
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '삭제 실패' })
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 메타 (이름·배대지) */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">기본 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="meta_name" className="block text-xs font-medium text-slate-700 mb-1">
              양식 이름
            </label>
            <input
              id="meta_name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label htmlFor="meta_fid" className="block text-xs font-medium text-slate-700 mb-1">
              배대지
            </label>
            <select
              id="meta_fid"
              value={fid}
              onChange={(e) => setFid(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="">(연결 안 함)</option>
              {forwarders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 컬럼 매핑 */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-baseline justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900">
            컬럼 매핑 <span className="text-slate-500 font-normal">({columns.length})</span>
          </h2>
          <p className="text-xs text-slate-500">
            각 컬럼이 주문의 어떤 값으로 채워질지 지정합니다. “사용자 입력” 컬럼은 변환할 때마다 모달에서 입력받습니다.
            {sampleOrder
              ? ' 우측 미리보기는 가장 최근 주문 1건으로 평가됩니다.'
              : ' 주문이 등록되면 우측에 미리보기가 표시됩니다.'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th className="px-3 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider w-14">컬럼</th>
                <th className="px-3 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider">헤더</th>
                <th className="px-3 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider">유형</th>
                <th className="px-3 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider">값</th>
                <th className="px-3 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider">변환</th>
                <th className="px-3 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider text-center w-14">필수</th>
                {sampleOrder && (
                  <th className="px-3 py-2 font-semibold text-emerald-700 text-xs uppercase tracking-wider w-56">
                    미리보기
                    <span className="ml-1 font-normal normal-case text-slate-500">
                      ({sampleOrder.market_order_number ?? sampleOrder.order_number})
                    </span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {columns.map((c, idx) => (
                <tr key={c.column_index} className="align-top">
                  <td className="px-3 py-2 text-xs text-slate-500 font-mono whitespace-nowrap pt-3">
                    {c.column_letter ?? c.column_index}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={c.column_label}
                      onChange={(e) => patchCol(idx, { column_label: e.target.value })}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={c.source_kind}
                      onChange={(e) => patchCol(idx, { source_kind: e.target.value })}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    >
                      {SOURCE_KINDS.map((k) => (
                        <option key={k.value} value={k.value}>{k.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <ValueField col={c} onChange={(p) => patchCol(idx, p)} />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={c.transform ?? ''}
                      onChange={(e) => patchCol(idx, { transform: e.target.value || null })}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    >
                      {TRANSFORMS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center pt-3">
                    <input
                      type="checkbox"
                      checked={c.required}
                      onChange={(e) => patchCol(idx, { required: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                  </td>
                  {sampleOrder && (
                    <td className="px-3 py-2 pt-3">
                      <PreviewCell
                        col={c}
                        order={sampleOrder}
                        item={sampleItem}
                        account={sampleAccount}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 메시지 + 저장 */}
      {msg && (
        <div
          className={`text-xs rounded-md px-3 py-2 ${msg.kind === 'ok' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-rose-700 bg-rose-50 border border-rose-200'}`}
        >
          {msg.text}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onDelete}
          disabled={saving || deleting}
          className="text-xs font-medium text-rose-700 hover:text-rose-800 px-3 py-1.5 rounded hover:bg-rose-50 disabled:opacity-50"
        >
          {deleting ? '삭제 중…' : '양식 삭제'}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || deleting}
          className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  )
}

function ValueField({
  col,
  onChange,
}: {
  col: EditorColumn
  onChange: (p: Partial<EditorColumn>) => void
}) {
  const wrap = 'w-full rounded border border-slate-200 px-2 py-1 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none'

  switch (col.source_kind) {
    case 'order_field':
      return (
        <select
          value={col.source_path ?? ''}
          onChange={(e) => onChange({ source_path: e.target.value })}
          className={wrap}
        >
          <option value="">(선택)</option>
          {ORDER_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      )
    case 'item_field':
      return (
        <select
          value={col.source_path ?? ''}
          onChange={(e) => onChange({ source_path: e.target.value })}
          className={wrap}
        >
          <option value="">(선택)</option>
          {ITEM_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      )
    case 'account_field':
      return (
        <select
          value={col.source_path ?? ''}
          onChange={(e) => onChange({ source_path: e.target.value })}
          className={wrap}
        >
          <option value="">(선택)</option>
          {ACCOUNT_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      )
    case 'order_meta':
      return (
        <select
          value={col.source_path ?? ''}
          onChange={(e) => onChange({ source_path: e.target.value })}
          className={wrap}
        >
          <option value="">(선택)</option>
          {META_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      )
    case 'constant':
      return (
        <input
          type="text"
          value={col.constant_value ?? ''}
          onChange={(e) => onChange({ constant_value: e.target.value })}
          placeholder="고정 값"
          className={wrap}
        />
      )
    case 'composite':
      return (
        <input
          type="text"
          value={col.composite_template ?? ''}
          onChange={(e) => onChange({ composite_template: e.target.value })}
          placeholder="{buyer_address} {buyer_detail_address}"
          className={wrap}
        />
      )
    case 'user_input': {
      const opts = (col.user_input_options ?? []).join(',')
      return (
        <div className="space-y-1">
          <input
            type="text"
            value={col.user_input_label ?? ''}
            onChange={(e) => onChange({ user_input_label: e.target.value })}
            placeholder="질문 라벨 (예: 브랜드)"
            className={wrap}
          />
          <input
            type="text"
            value={opts}
            onChange={(e) =>
              onChange({
                user_input_options: e.target.value
                  ? e.target.value.split(',').map((s) => s.trim()).filter((s) => s !== '')
                  : null,
              })
            }
            placeholder="옵션 enum (콤마 구분, 비면 자유 입력)"
            className={wrap}
          />
          <input
            type="text"
            value={col.constant_value ?? ''}
            onChange={(e) => onChange({ constant_value: e.target.value })}
            placeholder="기본 값 (옵션)"
            className={wrap}
          />
        </div>
      )
    }
    default:
      return <span className="text-xs text-slate-400">—</span>
  }
}

function PreviewCell({
  col,
  order,
  item,
  account,
}: {
  col: EditorColumn
  order: SampleOrder
  item: SampleOrderItem | null
  account: SampleAccount
}) {
  const evaluated = evaluateColumn(col, order, item, account)
  const display =
    evaluated === '' || evaluated == null
      ? null
      : typeof evaluated === 'number'
        ? evaluated.toLocaleString('ko-KR')
        : String(evaluated)

  if (display == null) {
    if (col.source_kind === 'user_input') {
      return (
        <span className="text-[11px] text-slate-400 italic">
          변환 시 입력
        </span>
      )
    }
    return <span className="text-[11px] text-slate-400">—</span>
  }
  return (
    <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 break-all inline-block max-w-full">
      {display}
    </span>
  )
}
