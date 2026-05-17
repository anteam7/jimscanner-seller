'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

// b2b_orders.status enum 과 일치, 라벨은 마켓 셀러 관점
export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending', label: '마켓 주문 접수' },
  { value: 'confirmed', label: '매입 발주 완료' },
  { value: 'paid', label: '해외 매입 완료' },
  { value: 'forwarder_submitted', label: '배대지 입고' },
  { value: 'in_transit', label: '한국행 운송 중' },
  { value: 'arrived_korea', label: '한국 통관' },
  { value: 'delivered', label: '구매자 수령' },
  { value: 'completed', label: '구매 확정' },
  { value: 'cancelled', label: '취소' },
  { value: 'refunded', label: '환불' },
]

const TRANSITIONS: Record<string, string[]> = {
  pending:             ['confirmed', 'cancelled'],
  confirmed:           ['paid', 'cancelled'],
  paid:                ['forwarder_submitted', 'cancelled', 'refunded'],
  forwarder_submitted: ['in_transit', 'cancelled', 'refunded'],
  in_transit:          ['arrived_korea', 'cancelled'],
  arrived_korea:       ['delivered'],
  delivered:           ['completed'],
  completed:           [],
  cancelled:           [],
  refunded:            [],
}

export default function OrderStatusSelector({
  orderId,
  currentStatus,
}: {
  orderId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allowedNext = TRANSITIONS[currentStatus] ?? []
  const disabled = allowedNext.length === 0 || updating || pending

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    if (next === currentStatus) return
    setUpdating(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error || `상태 변경에 실패했습니다 (HTTP ${res.status})`)
      }
      startTransition(() => router.refresh())
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태 변경 중 오류가 발생했습니다.')
    } finally {
      setUpdating(false)
    }
  }

  if (allowedNext.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        이 상태에서는 더 이상 전환할 수 있는 단계가 없습니다.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <label htmlFor="status-selector" className="block text-xs font-medium text-slate-700">
        상태 변경
      </label>
      <select
        id="status-selector"
        value={currentStatus}
        onChange={onChange}
        disabled={disabled}
        className="block w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        <option value={currentStatus} disabled>
          {STATUS_OPTIONS.find((o) => o.value === currentStatus)?.label ?? currentStatus} (현재)
        </option>
        {allowedNext.map((s) => {
          const meta = STATUS_OPTIONS.find((o) => o.value === s)
          return (
            <option key={s} value={s}>
              → {meta?.label ?? s}
            </option>
          )
        })}
      </select>
      {updating && <p className="text-xs text-slate-500">변경 중…</p>}
      {error && <p className="text-xs text-rose-700">{error}</p>}
    </div>
  )
}
