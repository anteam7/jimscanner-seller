'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type OrderItem = {
  id: string
  display_order: number
  product_name: string
  quantity: number
  sale_price_krw: number | string | null
}

const REASON_OPTIONS = [
  { value: '',                label: '선택 안 함' },
  { value: 'product_defect',  label: '상품 불량' },
  { value: 'wrong_item',      label: '오배송' },
  { value: 'customer_cancel', label: '구매자 변심' },
  { value: 'customs_blocked', label: '통관 보류' },
  { value: 'market_dispute',  label: '마켓 분쟁' },
  { value: 'shipping_delay', label: '배송 지연' },
  { value: 'other',           label: '기타' },
]

const REFUND_METHOD_OPTIONS = [
  { value: '',              label: '선택 안 함' },
  { value: 'card',          label: '카드 취소' },
  { value: 'bank_transfer', label: '계좌 이체' },
  { value: 'point',         label: '포인트' },
  { value: 'partial',       label: '부분 환불' },
]

export default function NewRefundForm({
  orderId,
  items,
  totalSale,
}: {
  orderId: string
  items: OrderItem[]
  totalSale: number | null
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderItemId, setOrderItemId] = useState('')
  const [reason, setReason] = useState('')
  const [reasonCategory, setReasonCategory] = useState('')
  const [refundAmount, setRefundAmount] = useState(totalSale != null ? String(totalSale) : '')
  const [refundMethod, setRefundMethod] = useState('')
  const [buyerMessage, setBuyerMessage] = useState('')
  const [internalNotes, setInternalNotes] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!reason.trim()) {
      setError('환불 사유를 입력하세요.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          order_item_id: orderItemId || null,
          reason: reason.trim(),
          reason_category: reasonCategory || null,
          refund_amount_krw: refundAmount ? Number(refundAmount) : 0,
          refund_method: refundMethod || null,
          buyer_message: buyerMessage.trim() || null,
          internal_notes: internalNotes.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error ?? '환불 등록에 실패했습니다.')
        return
      }
      router.push(`/refunds/${data.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '네트워크 오류')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 라인 선택 */}
      <div>
        <label htmlFor="order_item_id" className="block text-xs font-semibold text-slate-700 mb-1.5">
          환불 대상 <span className="text-slate-400 font-normal">(미선택 시 주문 전체)</span>
        </label>
        <select
          id="order_item_id"
          value={orderItemId}
          onChange={(e) => setOrderItemId(e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">주문 전체</option>
          {items.map((it) => {
            const price = it.sale_price_krw == null || it.sale_price_krw === ''
              ? ''
              : ` · ${new Intl.NumberFormat('ko-KR').format(Number(it.sale_price_krw))}원`
            return (
              <option key={it.id} value={it.id}>
                {it.product_name} ×{it.quantity}{price}
              </option>
            )
          })}
        </select>
      </div>

      {/* 사유 카테고리 */}
      <div>
        <label htmlFor="reason_category" className="block text-xs font-semibold text-slate-700 mb-1.5">
          사유 분류 <span className="text-slate-400 font-normal">(월간 통계용)</span>
        </label>
        <select
          id="reason_category"
          value={reasonCategory}
          onChange={(e) => setReasonCategory(e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {REASON_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* 사유 본문 */}
      <div>
        <label htmlFor="reason" className="block text-xs font-semibold text-slate-700 mb-1.5">
          환불 사유 <span className="text-rose-600">*</span>
        </label>
        <textarea
          id="reason"
          required
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="구체적인 사유 (예: '구매자가 사이즈 다른 거 보내달라 요청, 마켓에서 전체 환불 처리')"
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* 환불 금액 + 방법 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="refund_amount" className="block text-xs font-semibold text-slate-700 mb-1.5">
            환불 금액 (KRW)
          </label>
          <input
            id="refund_amount"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            placeholder="0"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {totalSale != null && (
            <p className="mt-1 text-[11px] text-slate-500">
              참고 · 주문 판매가 총액 <span className="font-semibold text-slate-700 tabular-nums">{new Intl.NumberFormat('ko-KR').format(totalSale)}원</span>
            </p>
          )}
        </div>
        <div>
          <label htmlFor="refund_method" className="block text-xs font-semibold text-slate-700 mb-1.5">
            환불 방법
          </label>
          <select
            id="refund_method"
            value={refundMethod}
            onChange={(e) => setRefundMethod(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {REFUND_METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 구매자 메시지 */}
      <div>
        <label htmlFor="buyer_message" className="block text-xs font-semibold text-slate-700 mb-1.5">
          구매자 메시지 <span className="text-slate-400 font-normal">(마켓에서 받은 원문)</span>
        </label>
        <textarea
          id="buyer_message"
          rows={2}
          value={buyerMessage}
          onChange={(e) => setBuyerMessage(e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* 내부 메모 */}
      <div>
        <label htmlFor="internal_notes" className="block text-xs font-semibold text-slate-700 mb-1.5">
          내부 메모 <span className="text-slate-400 font-normal">(셀러만 봄)</span>
        </label>
        <textarea
          id="internal_notes"
          rows={2}
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* async 등록 진행을 live region 으로 → 스크린리더 announce.
          진행은 별도 표시 텍스트가 없어 sr-only 로만(버튼 라벨은 그대로), 에러는 기존 시각 블록에 role="alert" 만 부여 (TrackingEditor/OrderStatusSelector 패턴과 동일, 시각 무변경). */}
      <p role="status" aria-live="polite" className="sr-only">
        {submitting ? '환불 요청 등록 중…' : ''}
      </p>
      {error && (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center px-4 py-2 rounded-md text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? '등록 중…' : '환불 요청 등록'}
        </button>
      </div>
    </form>
  )
}
