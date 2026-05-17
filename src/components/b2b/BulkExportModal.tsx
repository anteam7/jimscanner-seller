'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ForwarderTemplateLite } from './ForwarderExportModal'

export type SelectedOrderInfo = {
  id: string
  market_order_number: string | null
  order_number: string
  buyer_name: string | null
  buyer_phone: string | null
  buyer_postal_code: string | null
  buyer_address: string | null
  buyer_customs_code: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  templates: ForwarderTemplateLite[]
  orderIds: string[]
  orderCount: number
  groupCount: number
  selectedOrders?: SelectedOrderInfo[]
  onSuccess?: () => void
}

function countMissing(orders: SelectedOrderInfo[]): {
  customs: number
  postal: number
  phone: number
  name: number
  address: number
} {
  let customs = 0, postal = 0, phone = 0, name = 0, address = 0
  for (const o of orders) {
    if (!o.buyer_customs_code?.trim()) customs++
    if (!o.buyer_postal_code?.trim()) postal++
    if (!o.buyer_phone?.trim()) phone++
    if (!o.buyer_name?.trim()) name++
    if (!o.buyer_address?.trim()) address++
  }
  return { customs, postal, phone, name, address }
}

export default function BulkExportModal({
  open,
  onClose,
  templates,
  orderIds,
  orderCount,
  groupCount,
  selectedOrders = [],
  onSuccess,
}: Props) {
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id ?? '')
  const [userInputs, setUserInputs] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const tpl = templates.find((t) => t.id === templateId)
    if (!tpl) {
      setUserInputs({})
      return
    }
    const next: Record<string, string> = {}
    for (const c of tpl.columns) {
      if (c.source_kind !== 'user_input') continue
      const key = c.user_input_label ?? `col_${c.column_index}`
      next[key] = c.constant_value ?? ''
    }
    setUserInputs(next)
  }, [templateId, templates])

  const tpl = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId],
  )

  const userInputCols = useMemo(
    () => (tpl?.columns ?? []).filter((c) => c.source_kind === 'user_input'),
    [tpl],
  )

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function onDownload() {
    if (!tpl) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/orders/export-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: tpl.id,
          order_ids: orderIds,
          user_inputs: userInputs,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `다운로드 실패 (${res.status})`)
      }
      const cd = res.headers.get('Content-Disposition') ?? ''
      const match = cd.match(/filename\*=UTF-8''([^;\s]+)/)
      let filename = `${tpl.name}_${orderCount}건.xlsx`
      if (match) {
        try {
          filename = decodeURIComponent(match[1])
        } catch {
          /* malformed */
        }
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      onClose()
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : '다운로드 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-export-title"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 id="bulk-export-title" className="text-base font-semibold text-slate-900">
              합배송 양식 변환
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              선택한 <span className="font-semibold text-slate-700">{orderCount}건</span>의 주문을
              {groupCount > 0 && groupCount < orderCount && (
                <> · 같은 수취인 <span className="font-semibold text-slate-700">{groupCount}그룹</span>으로 묶어</>
              )}{' '}
              1개 xlsx 파일로 다운로드합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 -mr-2 p-2 disabled:opacity-50"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          {/* 누락 경고 */}
          {(() => {
            if (selectedOrders.length === 0) return null
            const m = countMissing(selectedOrders)
            const items: string[] = []
            if (m.customs > 0) items.push(`통관코드 ${m.customs}건`)
            if (m.postal > 0) items.push(`우편번호 ${m.postal}건`)
            if (m.name > 0) items.push(`수취인명 ${m.name}건`)
            if (m.phone > 0) items.push(`전화 ${m.phone}건`)
            if (m.address > 0) items.push(`주소 ${m.address}건`)
            if (items.length === 0) return null
            return (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <div className="flex-1 text-xs">
                    <p className="font-semibold text-amber-900">선택한 {orderCount}건 중 일부 누락</p>
                    <p className="text-amber-800 mt-0.5">
                      {items.join(' · ')} 비어 있음 — 양식에 빈 값으로 채워집니다. 배대지에서 거부될 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            )
          })()}

          <div>
            <label htmlFor="bulk_tpl" className="block text-xs font-semibold text-slate-700 mb-1.5">
              양식 선택
            </label>
            {templates.length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-3">
                사용 가능한 양식이 없습니다.
              </p>
            ) : (
              <select
                id="bulk_tpl"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <optgroup label="공유 템플릿">
                  {templates
                    .filter((t) => t.owner_account_id == null)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.forwarder_name ? ` — ${t.forwarder_name}` : ''}
                      </option>
                    ))}
                </optgroup>
                {templates.some((t) => t.owner_account_id != null) && (
                  <optgroup label="내 양식">
                    {templates
                      .filter((t) => t.owner_account_id != null)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            )}
          </div>

          {userInputCols.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">추가 입력 (모든 주문에 동일 적용)</p>
              <div className="space-y-3">
                {userInputCols.map((c) => {
                  const key = c.user_input_label ?? `col_${c.column_index}`
                  const value = userInputs[key] ?? ''
                  const enumOptions = (c.user_input_options ?? []).filter((o) => o !== '')
                  const isEnum = enumOptions.length > 0
                  return (
                    <div key={c.column_index}>
                      <label htmlFor={`bui_${c.column_index}`} className="block text-xs text-slate-600 mb-1">
                        {c.user_input_label ?? c.column_label}
                        {c.required && <span className="text-rose-600 ml-1">*</span>}
                      </label>
                      {isEnum ? (
                        <select
                          id={`bui_${c.column_index}`}
                          value={value}
                          onChange={(e) => setUserInputs((p) => ({ ...p, [key]: e.target.value }))}
                          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        >
                          <option value="">(선택 안 함)</option>
                          {enumOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`bui_${c.column_index}`}
                          type="text"
                          value={value}
                          onChange={(e) => setUserInputs((p) => ({ ...p, [key]: e.target.value }))}
                          placeholder={c.constant_value ?? ''}
                          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-end gap-2 rounded-b-xl">
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={!tpl || submitting || templates.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {submitting ? '생성 중…' : `${orderCount}건 다운로드`}
          </button>
        </div>
      </div>
    </div>
  )
}
