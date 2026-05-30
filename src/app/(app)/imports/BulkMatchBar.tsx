'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export type BulkCandidate = {
  receiptId: string
  orderId: string
  label: string
  score: number
}

/**
 * 추천 점수가 높은 미매칭 영수증을 일괄 매칭.
 * ≥90점(고신뢰)·70~89점(검토 권장) 을 분리해 일괄 수락.
 * 개별 ImportMatchAction 과 동일한 PATCH 엔드포인트 사용 → 각 영수증에서 [해제]로 복구 가능.
 */
export function BulkMatchBar({ high, mid }: { high: BulkCandidate[]; mid: BulkCandidate[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<null | 'high' | 'mid'>(null)
  const [result, setResult] = useState<string | null>(null)

  async function run(list: BulkCandidate[], which: 'high' | 'mid') {
    if (list.length === 0) return
    const desc = which === 'high' ? '90점 이상 (고신뢰)' : '70~89점 (검토 권장)'
    if (
      !window.confirm(
        `${desc} 추천 ${list.length}건을 일괄 매칭하시겠습니까?\n\n각 영수증을 추천 1순위 주문에 연결합니다. 매칭 후 [해제]로 되돌릴 수 있습니다.`,
      )
    )
      return
    setBusy(which)
    setResult(null)
    let ok = 0
    let fail = 0
    for (const c of list) {
      try {
        const res = await fetch(`/api/imports/supplier-orders/${c.receiptId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matched_order_id: c.orderId }),
        })
        if (res.ok) ok++
        else fail++
      } catch {
        fail++
      }
    }
    setBusy(null)
    setResult(`${ok}건 매칭 완료${fail > 0 ? ` · ${fail}건 실패` : ''}`)
    router.refresh()
  }

  if (high.length === 0 && mid.length === 0) return null

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 px-4 py-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-indigo-900">⚡ 추천 일괄 매칭</span>
      {high.length > 0 && (
        <button
          type="button"
          onClick={() => run(high, 'high')}
          disabled={busy !== null}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          ≥90점 {high.length}건 일괄 수락
        </button>
      )}
      {mid.length > 0 && (
        <button
          type="button"
          onClick={() => run(mid, 'mid')}
          disabled={busy !== null}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md text-amber-800 border border-amber-300 bg-white hover:bg-amber-50 disabled:opacity-50 transition-colors"
        >
          70–89점 {mid.length}건 검토 수락
        </button>
      )}
      {busy && <span className="text-xs text-slate-500">매칭 중…</span>}
      {result && <span className="text-xs text-emerald-700 font-medium">{result}</span>}
      <span className="w-full text-[11px] text-slate-500">
        점수가 높을수록 통화·날짜·금액 일치도가 높습니다. 70~89점은 오매칭 가능성이 있어 검토를 권장합니다. 매칭 후 각 영수증에서 [해제]로 되돌릴 수 있습니다.
      </span>
    </div>
  )
}
