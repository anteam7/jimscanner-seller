'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    if (!body.trim()) return setError('내용을 입력해 주세요.')
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) {
        setError(json.error ?? '저장 실패')
        return
      }
      setBody('')
      router.refresh()
    } catch {
      setError('네트워크 오류')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg bg-white shadow-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
        <span>답글</span>
        <span className="font-normal text-slate-400 tabular-nums">{body.length} / 5000</span>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 5000))}
        rows={5}
        placeholder="추가로 알려주실 내용이 있으면 적어 주세요."
        className="block w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
      />
      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={send}
          disabled={submitting}
          className="h-9 px-5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded transition-colors"
        >
          {submitting ? '전송 중…' : '답글 전송'}
        </button>
      </div>
    </div>
  )
}
