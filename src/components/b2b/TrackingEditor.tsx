'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const KOREAN_CARRIERS = [
  'CJ대한통운',
  '한진택배',
  '롯데택배',
  '로젠택배',
  '우체국택배',
  '쿠팡로지스틱스',
  'CU편의점택배',
  'GS Postbox',
  '기타',
]

const OVERSEAS_CARRIERS = [
  { value: 'dhl',         label: 'DHL' },
  { value: 'ups',         label: 'UPS' },
  { value: 'usps',        label: 'USPS' },
  { value: 'fedex',       label: 'FedEx' },
  { value: 'ems',         label: 'EMS' },
  { value: 'yamato',      label: 'Yamato (ヤマト)' },
  { value: 'sagawa',      label: 'Sagawa (佐川)' },
  { value: 'japan-post',  label: 'Japan Post' },
  { value: 'sf-express',  label: 'SF Express (顺丰)' },
  { value: 'ems-china',   label: 'EMS China' },
  { value: 'china-post',  label: 'China Post' },
  { value: 'royal-mail',  label: 'Royal Mail' },
  { value: 'dpd',         label: 'DPD' },
  { value: 'other',       label: '기타' },
]

type Props = {
  orderId: string
  itemId: string
  initialTrackingNumber: string | null
  initialTrackingNumberOverseas: string | null
  initialCarrier: string | null
}

export function TrackingEditor({
  orderId,
  itemId,
  initialTrackingNumber,
  initialTrackingNumberOverseas,
  initialCarrier,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber ?? '')
  const [trackingOverseas, setTrackingOverseas] = useState(initialTrackingNumberOverseas ?? '')
  const [carrier, setCarrier] = useState(initialCarrier ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasAny = !!(initialTrackingNumber || initialTrackingNumberOverseas || initialCarrier)
  const trackingOverseasTrim = trackingOverseas.trim()

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}/tracking`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracking_number: trackingNumber.trim() || null,
          tracking_number_overseas: trackingOverseasTrim || null,
          carrier: carrier.trim() || null,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string; status_transitioned?: boolean }
      if (!res.ok) {
        setError(json.error ?? '업데이트 실패')
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError('네트워크 오류')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 hover:text-indigo-800 hover:underline underline-offset-2"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
        </svg>
        {hasAny ? '운송장 수정' : '운송장 입력'}
      </button>
    )
  }

  const isOverseasCarrierValue =
    !!carrier && OVERSEAS_CARRIERS.some((c) => c.value === carrier)
  const overseasSelectValue = isOverseasCarrierValue ? carrier : ''
  const isKoreanCarrierValue = KOREAN_CARRIERS.includes(carrier)
  const koreanSelectValue = isKoreanCarrierValue ? carrier : ''

  return (
    <div className="mt-2 p-3 rounded-md border border-indigo-200 bg-indigo-50/40 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-indigo-900">운송장 정보</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="운송장 입력 폼 닫기"
          className="text-[11px] text-slate-500 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
        >
          닫기
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="block">
          <span className="block text-[10px] text-slate-600 mb-0.5">현지 트래킹 (매입처 → 배대지)</span>
          <input
            type="text"
            value={trackingOverseas}
            onChange={(e) => setTrackingOverseas(e.target.value)}
            placeholder="9405..."
            className="block w-full h-7 px-2 text-xs font-mono bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </label>
        <label className="block">
          <span className="block text-[10px] text-slate-600 mb-0.5">해외 캐리어</span>
          <select
            value={overseasSelectValue}
            onChange={(e) => setCarrier(e.target.value)}
            className="block w-full h-7 px-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">선택 (DHL / UPS / FedEx / Yamato …)</option>
            {OVERSEAS_CARRIERS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
        {trackingOverseasTrim && (
          <a
            href={`https://t.17track.net/en#nums=${encodeURIComponent(trackingOverseasTrim)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline"
            title="17track 외부 사이트에서 트래킹"
          >
            🔎 17track 에서 추적 →
          </a>
        )}
      </div>

      <div className="pt-1.5 mt-1.5 border-t border-indigo-100 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-[10px] text-slate-600 mb-0.5">국내 택배사</span>
          <select
            value={koreanSelectValue}
            onChange={(e) => setCarrier(e.target.value)}
            className="block w-full h-7 px-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">선택</option>
            {KOREAN_CARRIERS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-[10px] text-slate-600 mb-0.5">국내 운송장</span>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="1234-5678..."
            className="block w-full h-7 px-2 text-xs font-mono bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </label>
      </div>

      <p className="text-[10px] text-slate-500 leading-relaxed">
        💡 현지 트래킹 입력 시 주문 상태가 <b>해외 매입 완료</b> 라면 자동으로 <b>한국행 운송 중</b> 으로 전이됩니다.
      </p>

      {error && <p className="text-[11px] text-rose-700">{error}</p>}

      <div className="flex items-center justify-end gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={saving}
          className="h-7 px-2 text-[11px] text-slate-600 hover:text-slate-800 disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="h-7 px-3 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  )
}
