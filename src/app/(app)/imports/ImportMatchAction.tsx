'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  receiptId: string
  recommendation?: {
    orderId: string
    label: string // 화면 표시용 (예: "COUPANG-XXX")
    score: number
    reasons: string[]
  } | null
  matchedOrderLabel?: string | null
}

export function ImportMatchAction({ receiptId, recommendation, matchedOrderLabel }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function link(orderId: string | null) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/imports/supplier-orders/${receiptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matched_order_id: orderId }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? '매칭 실패')
        setBusy(false)
        return
      }
      router.refresh()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
      setBusy(false)
    }
  }

  if (matchedOrderLabel) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded">
          ✓ {matchedOrderLabel}
        </span>
        <button
          type="button"
          onClick={() => link(null)}
          disabled={busy}
          className="text-[10px] text-slate-500 hover:text-rose-600 hover:underline underline-offset-2 disabled:opacity-50"
          title="매칭 해제"
        >
          해제
        </button>
      </div>
    )
  }

  if (!recommendation) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded">
        대기
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => link(recommendation.orderId)}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-300 rounded hover:bg-indigo-100 disabled:opacity-50 transition-colors"
          title={recommendation.reasons.join(' · ')}
        >
          🔗 {recommendation.label}
        </button>
        <span className="text-[10px] text-slate-400 tabular-nums">{recommendation.score}점</span>
      </div>
      {error && <span className="text-[10px] text-rose-600">{error}</span>}
    </div>
  )
}
