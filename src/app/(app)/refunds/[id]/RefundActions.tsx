'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TRANSITIONS: Record<string, Array<{ to: string; label: string; cls: string; confirm?: string }>> = {
  requested: [
    { to: 'approved',  label: '승인', cls: 'bg-indigo-600 hover:bg-indigo-500 text-white' },
    { to: 'denied',    label: '거절', cls: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50', confirm: '환불을 거절하시겠습니까?' },
    { to: 'cancelled', label: '취소', cls: 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50', confirm: '환불 요청을 취소하시겠습니까?' },
  ],
  approved: [
    { to: 'processing', label: '처리 시작', cls: 'bg-sky-600 hover:bg-sky-500 text-white' },
    { to: 'settled',    label: '정산완료',  cls: 'bg-emerald-600 hover:bg-emerald-500 text-white', confirm: '정산을 완료 처리하면 주문 상태도 환불 완료로 바뀝니다. 계속하시겠습니까?' },
    { to: 'cancelled',  label: '취소',      cls: 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50', confirm: '승인된 환불을 취소하시겠습니까?' },
  ],
  processing: [
    { to: 'settled',   label: '정산완료', cls: 'bg-emerald-600 hover:bg-emerald-500 text-white', confirm: '정산을 완료 처리하면 주문 상태도 환불 완료로 바뀝니다. 계속하시겠습니까?' },
    { to: 'cancelled', label: '취소',     cls: 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50' },
  ],
  denied: [
    { to: 'requested', label: '재검토',  cls: 'bg-amber-500 hover:bg-amber-400 text-white' },
    { to: 'cancelled', label: '취소',    cls: 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50' },
  ],
  settled:   [],
  cancelled: [],
}

export default function RefundActions({
  refundId,
  currentStatus,
}: {
  refundId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const available = TRANSITIONS[currentStatus] ?? []

  async function changeStatus(next: string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setError(null)
    setPending(next)
    try {
      const res = await fetch(`/api/refunds/${refundId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error ?? '상태 변경에 실패했습니다.')
        return
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '네트워크 오류')
    } finally {
      setPending(null)
    }
  }

  if (available.length === 0) {
    return (
      <p className="text-xs text-slate-500 leading-relaxed">
        {currentStatus === 'settled' && '정산이 완료되었습니다. 추가 변경 불가.'}
        {currentStatus === 'cancelled' && '취소된 환불입니다. 추가 변경 불가.'}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {available.map((t) => (
        <button
          key={t.to}
          type="button"
          disabled={pending !== null}
          onClick={() => changeStatus(t.to, t.confirm)}
          className={`w-full inline-flex items-center justify-center px-3 py-2 rounded-md text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${t.cls}`}
        >
          {pending === t.to ? '처리 중…' : t.label}
        </button>
      ))}
      {error && (
        <p className="text-[11px] text-rose-700 mt-2">{error}</p>
      )}
    </div>
  )
}
