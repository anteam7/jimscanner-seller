'use client'

import { useEffect, useState, useCallback } from 'react'

type RateItem = { currency: string; rate: number; unit: number; isFallback: boolean }
type RatesPayload = { rates: Record<string, RateItem>; fetchedAt: string; isFallback: boolean }

// 주문 폼 상단에 표시할 통화 순서
const DISPLAY_CURRENCIES = ['USD', 'JPY', 'CNY', 'EUR']
const REFRESH_INTERVAL_MS = 5 * 60 * 1000

function formatRate(r: RateItem): string {
  return r.rate.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

export default function ExchangeRateBadge() {
  const [data, setData] = useState<RatesPayload | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/exchange-rate')
      if (!res.ok) throw new Error(`${res.status}`)
      const json: RatesPayload = await res.json()
      setData(json)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [load])

  if (loading) {
    return (
      <div
        role="status"
        aria-label="환율 조회 중"
        className="flex items-center gap-1.5 text-xs text-slate-400"
      >
        <span
          aria-hidden="true"
          className="inline-block w-3 h-3 rounded-full border border-slate-600 border-t-indigo-400 animate-spin"
        />
        환율 조회 중...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div
        role="alert"
        className="inline-flex items-center gap-1.5 text-xs text-red-600 bg-red-900/20 px-2 py-1 rounded-md"
      >
        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        환율 조회 실패
      </div>
    )
  }

  return (
    <div
      aria-label="실시간 기준 환율"
      className="flex flex-wrap items-center gap-1.5"
    >
      {/* 장애 시 fallback 안내 배지 */}
      {data.isFallback && (
        <span
          role="alert"
          className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-700/40 px-2 py-0.5 rounded-full"
        >
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          전일 기준 (API 일시 장애)
        </span>
      )}

      {/* 통화별 환율 뱃지 */}
      {DISPLAY_CURRENCIES.map((cur) => {
        const r = data.rates[cur]
        if (!r) return null
        const label = cur === 'JPY' ? 'JPY(100)' : cur
        return (
          <span
            key={cur}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200"
          >
            <span className="text-slate-400 font-medium">{label}</span>
            <span className="text-slate-900 font-semibold">₩{formatRate(r)}</span>
          </span>
        )
      })}

      {/* 마지막 갱신 시각 */}
      <span className="text-xs text-slate-400 ml-0.5">
        {formatTime(data.fetchedAt)} 기준
      </span>
    </div>
  )
}
