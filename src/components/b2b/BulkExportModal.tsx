'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ForwarderTemplateLite } from './ForwarderExportModal'

type Props = {
  open: boolean
  onClose: () => void
  templates: ForwarderTemplateLite[]
  orderIds: string[]
  orderCount: number
  groupCount: number
  onSuccess?: () => void
}

export default function BulkExportModal({
  open,
  onClose,
  templates,
  orderIds,
  orderCount,
  groupCount,
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
