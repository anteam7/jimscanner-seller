'use client'

import { useEffect, useMemo, useState } from 'react'

export type ForwarderTemplateColumn = {
  column_index: number
  column_label: string
  source_kind: string
  user_input_label: string | null
  user_input_options: string[] | null
  constant_value: string | null
  required: boolean
}

export type ForwarderTemplateLite = {
  id: string
  name: string
  owner_account_id: string | null
  forwarder_id: string | null
  forwarder_name: string | null
  combine_rule: string | null
  columns: ForwarderTemplateColumn[]
}

export type OrderBuyerInfo = {
  buyer_name: string | null
  buyer_phone: string | null
  buyer_postal_code: string | null
  buyer_address: string | null
  buyer_customs_code: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  orderId: string
  templates: ForwarderTemplateLite[]
  defaultTemplateId?: string | null
  buyerInfo?: OrderBuyerInfo | null
}

function detectMissing(b: OrderBuyerInfo | null | undefined): string[] {
  if (!b) return []
  const missing: string[] = []
  if (!b.buyer_name?.trim()) missing.push('수취인명')
  if (!b.buyer_phone?.trim()) missing.push('전화')
  if (!b.buyer_postal_code?.trim()) missing.push('우편번호')
  if (!b.buyer_address?.trim()) missing.push('주소')
  if (!b.buyer_customs_code?.trim()) missing.push('통관코드')
  return missing
}

export default function ForwarderExportModal({
  open,
  onClose,
  orderId,
  templates,
  defaultTemplateId,
  buyerInfo,
}: Props) {
  const [templateId, setTemplateId] = useState<string>(
    defaultTemplateId ?? templates[0]?.id ?? '',
  )
  const [userInputs, setUserInputs] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 템플릿 바뀌면 user input 초기화 (constant_value 가 있으면 default 채움)
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

  // ESC 닫기
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
      const res = await fetch(`/api/orders/${orderId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: tpl.id, user_inputs: userInputs }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `다운로드 실패 (${res.status})`)
      }
      // 파일명은 Content-Disposition 에서 추출
      const cd = res.headers.get('Content-Disposition') ?? ''
      // RFC 5987: filename*=UTF-8''<encoded> — 끝의 ; 또는 공백/CR 모두 cut
      const match = cd.match(/filename\*=UTF-8''([^;\s]+)/)
      let filename = `${tpl.name}.xlsx`
      if (match) {
        try {
          filename = decodeURIComponent(match[1])
        } catch {
          /* malformed encoding — fallback 유지 */
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
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 id="export-modal-title" className="text-base font-semibold text-slate-900">
              배대지 양식으로 변환
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              주문 정보를 선택한 양식에 자동 채워 xlsx 로 다운로드합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 -mr-2 p-2"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          {/* 누락 경고 */}
          {(() => {
            const missing = detectMissing(buyerInfo)
            if (missing.length === 0) return null
            return (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <div className="flex-1 text-xs">
                    <p className="font-semibold text-amber-900">
                      구매자 정보 {missing.length}개 항목이 비어 있음
                    </p>
                    <p className="text-amber-800 mt-0.5">
                      {missing.join(' · ')} — 양식에 빈 값으로 채워집니다. 배대지에서 거부될 수 있으니
                      <a href={`/orders/${orderId}`} className="ml-1 underline underline-offset-2 font-medium hover:text-amber-900">
                        주문 상세에서 입력
                      </a>
                      을 권장합니다.
                    </p>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* 템플릿 선택 */}
          <div>
            <label htmlFor="tpl" className="block text-xs font-semibold text-slate-700 mb-1.5">
              양식 선택
            </label>
            {templates.length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-3">
                사용 가능한 양식이 없습니다. 공유 템플릿이 곧 추가될 예정입니다.
              </p>
            ) : (
              <select
                id="tpl"
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

          {/* 사용자 입력 */}
          {userInputCols.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">추가 입력</p>
              <p className="text-[11px] text-slate-500 mb-3">
                양식의 일부 컬럼은 주문 데이터로 자동 채울 수 없어 직접 입력이 필요합니다.
              </p>
              <div className="space-y-3">
                {userInputCols.map((c) => {
                  const key = c.user_input_label ?? `col_${c.column_index}`
                  const value = userInputs[key] ?? ''
                  // 빈 문자열 옵션은 "선택 안 함" 과 중복되므로 제거
                  const enumOptions = (c.user_input_options ?? []).filter((o) => o !== '')
                  const isEnum = enumOptions.length > 0
                  return (
                    <div key={c.column_index}>
                      <label
                        htmlFor={`ui_${c.column_index}`}
                        className="block text-xs text-slate-600 mb-1"
                      >
                        {c.user_input_label ?? c.column_label}
                        {c.required && <span className="text-rose-600 ml-1">*</span>}
                      </label>
                      {isEnum ? (
                        <select
                          id={`ui_${c.column_index}`}
                          value={value}
                          onChange={(e) =>
                            setUserInputs((p) => ({ ...p, [key]: e.target.value }))
                          }
                          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        >
                          <option value="">(선택 안 함)</option>
                          {enumOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`ui_${c.column_index}`}
                          type="text"
                          value={value}
                          onChange={(e) =>
                            setUserInputs((p) => ({ ...p, [key]: e.target.value }))
                          }
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

        {/* 푸터 */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-end gap-2 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
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
            {submitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4l3-3-3-3V4a8 8 0 1 0 8 8h-4l3 3 3-3h-2a8 8 0 0 1-8 8v-4l-3 3 3 3v-2a8 8 0 0 1-8-8z" />
                </svg>
                생성 중…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                XLSX 다운로드
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
