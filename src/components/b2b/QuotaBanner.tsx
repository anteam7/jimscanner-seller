'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { QuotaStatus } from '@/app/api/orders/quota-check/route'

export default function QuotaBanner() {
  const [data, setData] = useState<QuotaStatus | null>(null)
  const [fetchError, setFetchError] = useState(false)
  const hasData = useRef(false)

  async function load() {
    try {
      const r = await fetch('/api/orders/quota-check')
      const json: QuotaStatus | null = r.ok ? await r.json() : null
      if (json) {
        hasData.current = true
        setData(json)
        setFetchError(false)
      } else if (!hasData.current) {
        setFetchError(true)
      }
    } catch {
      if (!hasData.current) setFetchError(true)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 초기 로딩 실패 시에만 에러 배너 표시 (기존 데이터가 있으면 무시)
  if (fetchError && !data) {
    return (
      <div
        role="status"
        className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 flex items-center justify-between gap-4"
      >
        <p className="text-xs text-amber-600">
          쿼터 정보를 불러오지 못했습니다. 새로고침 해주세요.
        </p>
        <button
          type="button"
          onClick={load}
          className="flex-shrink-0 text-xs font-medium text-amber-700 hover:text-amber-800 underline underline-offset-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (!data || data.is_unlimited) return null
  if (!data.over_quota && !data.warn_80pct) return null

  const quota = data.effective_quota ?? 0
  const used = data.monthly_order_used
  const pct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 100

  if (data.over_quota) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200/60 bg-red-50 px-5 py-4 flex items-start justify-between gap-4"
      >
        <div>
          <p className="text-sm font-semibold text-red-700">
            이번 달 주문 할당량을 초과했습니다 ({used}/{quota}건)
          </p>
          <p className="text-xs text-red-600/80 mt-0.5">
            플랜을 업그레이드하면 더 많은 주문을 처리할 수 있습니다.
          </p>
        </div>
        <Link
          href="/pricing"
          className="flex-shrink-0 inline-flex items-center text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-colors px-3 py-1.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          업그레이드
        </Link>
      </div>
    )
  }

  // 80%~99% 경고 배너
  const remaining = data.remaining ?? 0
  return (
    <div
      role="status"
      aria-label={`주문 할당량 ${pct}% 사용`}
      className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4"
    >
      <div className="flex items-center justify-between gap-4 mb-2.5">
        <p className="text-sm font-semibold text-amber-700">
          이번 달 {used}/{quota}건 사용 · 남은 {remaining}건
        </p>
        <Link
          href="/pricing"
          className="flex-shrink-0 text-xs font-medium text-amber-700 hover:text-amber-800 underline underline-offset-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
        >
          플랜 업그레이드 →
        </Link>
      </div>

      {/* 프로그레스 바 */}
      <div
        className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-slate-400 mt-1.5">
        {data.plan_name_ko} 플랜 · 월 {quota}건 포함
      </p>
    </div>
  )
}
