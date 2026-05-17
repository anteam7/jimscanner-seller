'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Forwarder = { id: string; name: string }

type Props = {
  forwarders: Forwarder[]
  compact?: boolean
}

export default function TemplateUploadModal({ forwarders, compact }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [forwarderId, setForwarderId] = useState('')
  const [dataStartRow, setDataStartRow] = useState('2')
  const [dataSheetName, setDataSheetName] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  function reset() {
    setName('')
    setForwarderId('')
    setDataStartRow('2')
    setDataSheetName('')
    setError(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const file = fileInput.current?.files?.[0]
    if (!file) {
      setError('파일을 선택해주세요.')
      return
    }
    if (!name.trim()) {
      setError('양식 이름을 입력해주세요.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('name', name.trim())
      form.append('forwarder_id', forwarderId)
      form.append('data_start_row', dataStartRow || '2')
      if (dataSheetName.trim()) form.append('data_sheet_name', dataSheetName.trim())

      const res = await fetch('/api/form-templates', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `업로드 실패 (${res.status})`)
      setOpen(false)
      reset()
      router.push(`/templates/${json.template_id}`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '업로드 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100'
            : 'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700'
        }
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        새 양식 업로드
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setOpen(false)
          }}
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={onSubmit}
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">새 양식 업로드</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  배대지에서 받은 xlsx 또는 xls 양식을 업로드합니다. 첫 행 헤더를 읽어 매핑 항목을 자동 생성합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setOpen(false)}
                disabled={submitting}
                className="text-slate-400 hover:text-slate-600 -mr-2 p-2 disabled:opacity-50"
                aria-label="닫기"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              <div>
                <label htmlFor="tpl_file" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  파일 <span className="text-rose-600">*</span>
                </label>
                <input
                  ref={fileInput}
                  id="tpl_file"
                  name="file"
                  type="file"
                  accept=".xlsx,.xls"
                  required
                  disabled={submitting}
                  className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-slate-100 file:text-slate-700 file:font-medium hover:file:bg-slate-200"
                />
                <p className="text-[11px] text-slate-500 mt-1">최대 5MB. xls 는 업로드 시 xlsx 로 자동 변환됩니다.</p>
              </div>

              <div>
                <label htmlFor="tpl_name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  양식 이름 <span className="text-rose-600">*</span>
                </label>
                <input
                  id="tpl_name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={submitting}
                  placeholder="예: 내 보고있는짐 양식"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label htmlFor="tpl_forwarder" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  배대지
                </label>
                <select
                  id="tpl_forwarder"
                  value={forwarderId}
                  onChange={(e) => setForwarderId(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="">(연결 안 함)</option>
                  {forwarders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">주문에 같은 배대지가 지정되면 이 양식이 기본 선택됩니다.</p>
              </div>

              <details className="text-sm">
                <summary className="cursor-pointer text-xs font-semibold text-slate-700">고급 옵션</summary>
                <div className="mt-3 space-y-3 pl-1">
                  <div>
                    <label htmlFor="tpl_sheet" className="block text-xs text-slate-600 mb-1">
                      데이터 시트 이름
                    </label>
                    <input
                      id="tpl_sheet"
                      type="text"
                      value={dataSheetName}
                      onChange={(e) => setDataSheetName(e.target.value)}
                      disabled={submitting}
                      placeholder="(첫 시트 사용)"
                      className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="tpl_start" className="block text-xs text-slate-600 mb-1">
                      데이터 시작 행
                    </label>
                    <input
                      id="tpl_start"
                      type="number"
                      min={1}
                      value={dataStartRow}
                      onChange={(e) => setDataStartRow(e.target.value)}
                      disabled={submitting}
                      className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">헤더가 1행, 데이터가 2행부터인 경우 2</p>
                  </div>
                </div>
              </details>

              {error && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-end gap-2 rounded-b-xl">
              <button
                type="button"
                onClick={() => !submitting && setOpen(false)}
                disabled={submitting}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {submitting ? '업로드 중…' : '업로드'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
