'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

// b2b_orders.status enum 과 일치
export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending', label: '접수 대기' },
  { value: 'confirmed', label: '주문 확정' },
  { value: 'paid', label: '결제 완료' },
  { value: 'forwarder_submitted', label: '배대지 신청' },
  { value: 'in_transit', label: '운송 중' },
  { value: 'arrived_korea', label: '국내 도착' },
  { value: 'delivered', label: '배송 완료' },
  { value: 'completed', label: '거래 종료' },
  { value: 'cancelled', label: '취소' },
  { value: 'refunded', label: '환불' },
]

// 전이 가능한 다음 상태 (route.ts 와 일치 필요)
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

  if (disabled && allowedNext.length === 0) {
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
              {meta?.label ?? s} 으로 변경
            </option>
          )
        })}
      </select>
      {updating && (
        <p className="text-xs text-slate-500">변경 중…</p>
      )}
      {error && (
        <p className="text-xs text-rose-700">{error}</p>
      )}
    </div>
  )
}
