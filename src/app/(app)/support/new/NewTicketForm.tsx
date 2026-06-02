'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { value: 'general', label: '일반 문의' },
  { value: 'billing', label: '결제·요금' },
  { value: 'technical', label: '기술·버그' },
  { value: 'account', label: '계정·인증' },
  { value: 'other', label: '기타' },
]

export default function NewTicketForm() {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('general')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!subject.trim()) return setError('제목을 입력해 주세요.')
    if (!body.trim()) return setError('문의 내용을 입력해 주세요.')

    setSubmitting(true)
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, category, body }),
      })
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; error?: string }
      if (!res.ok || !json.ok || !json.id) {
        setError(json.error ?? '저장 실패')
        return
      }
      router.push(`/support/${json.id}`)
      router.refresh()
    } catch {
      setError('네트워크 오류')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg bg-white shadow-sm border border-slate-200 p-6 space-y-4">
      <label className="block">
        <span className="block text-xs font-semibold text-slate-700 mb-1">분류</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="block w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-xs font-semibold text-slate-700 mb-1">
          제목 <span className="text-rose-500">★</span>
        </span>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="간단한 제목"
          maxLength={200}
          className="block w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </label>

      <label className="block">
        <span className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
          <span>내용 <span className="text-rose-500">★</span></span>
          <span className="font-normal text-slate-400 tabular-nums">{body.length} / 5000</span>
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 5000))}
          placeholder="언제, 어디서, 어떤 동작에서 발생했는지 적어 주시면 답변이 빨라집니다."
          rows={10}
          className="block w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
        />
      </label>

      <p
        role="alert"
        className={error ? 'text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded' : 'sr-only'}
      >
        {error}
      </p>

      <p role="status" aria-live="polite" className="sr-only">
        {submitting ? '문의를 등록하는 중입니다…' : ''}
      </p>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => router.push('/support')}
          disabled={submitting}
          className="h-9 px-4 text-sm text-slate-700 hover:text-slate-900 disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className="h-9 px-5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded transition-colors"
        >
          {submitting ? '저장 중…' : '문의 등록'}
        </button>
      </div>
    </form>
  )
}
