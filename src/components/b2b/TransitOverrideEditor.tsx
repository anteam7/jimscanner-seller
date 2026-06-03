'use client'

import { useMemo, useState } from 'react'

type DefaultRow = {
  origin_country: string
  method: string
  avg_transit_days: number
  min_transit_days: number | null
  max_transit_days: number | null
}

type OverrideRow = {
  origin_country: string
  method: string
  avg_transit_days: number
}

const COUNTRY_LABEL: Record<string, string> = {
  US: '미국', JP: '일본', CN: '중국', UK: '영국', DE: '독일',
  FR: '프랑스', IT: '이탈리아', ES: '스페인', AU: '호주',
  CA: '캐나다', HK: '홍콩', TW: '대만', SG: '싱가포르',
  VN: '베트남', TH: '태국', OTHER: '기타',
}

const METHOD_LABEL: Record<string, string> = {
  air: '항공', boat: '선편', express: '특송', ems: 'EMS',
}

function keyOf(country: string, method: string) {
  return `${country}|${method}`
}

export default function TransitOverrideEditor({
  defaults,
  initialOverrides,
}: {
  defaults: DefaultRow[]
  initialOverrides: OverrideRow[]
}) {
  const [overrides, setOverrides] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {}
    for (const o of initialOverrides) m[keyOf(o.origin_country, o.method)] = o.avg_transit_days
    return m
  })
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const o of initialOverrides) m[keyOf(o.origin_country, o.method)] = String(o.avg_transit_days)
    return m
  })
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const rows = useMemo(
    () =>
      [...defaults].sort((a, b) => {
        const la = COUNTRY_LABEL[a.origin_country] ?? a.origin_country
        const lb = COUNTRY_LABEL[b.origin_country] ?? b.origin_country
        if (la !== lb) return la.localeCompare(lb, 'ko')
        return a.method.localeCompare(b.method)
      }),
    [defaults],
  )

  const overrideCount = Object.keys(overrides).length

  async function save(country: string, method: string) {
    const k = keyOf(country, method)
    const raw = drafts[k]
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 1 || n > 120) {
      setError('운송일수는 1~120 사이의 숫자여야 합니다.')
      return
    }
    setError(null)
    setBusyKey(k)
    try {
      const res = await fetch('/api/transit-overrides', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin_country: country, method, avg_transit_days: Math.round(n) }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error ?? '저장 실패')
        return
      }
      setOverrides((prev) => ({ ...prev, [k]: Math.round(n) }))
      setDrafts((prev) => ({ ...prev, [k]: String(Math.round(n)) }))
    } catch {
      setError('네트워크 오류로 저장하지 못했습니다.')
    } finally {
      setBusyKey(null)
    }
  }

  async function clear(country: string, method: string) {
    const k = keyOf(country, method)
    setError(null)
    setBusyKey(k)
    try {
      const res = await fetch(
        `/api/transit-overrides?country=${encodeURIComponent(country)}&method=${encodeURIComponent(method)}`,
        { method: 'DELETE' },
      )
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error ?? '삭제 실패')
        return
      }
      setOverrides((prev) => {
        const next = { ...prev }
        delete next[k]
        return next
      })
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[k]
        return next
      })
    } catch {
      setError('네트워크 오류로 삭제하지 못했습니다.')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          보정 적용 중{' '}
          <span className="font-semibold text-indigo-700 tabular-nums">{overrideCount}건</span>
        </p>
        {error && (
          <p className="text-xs text-rose-600" role="alert">{error}</p>
        )}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {busyKey ? '운송일수 보정 적용 중…' : ''}
      </p>

      <div className="rounded-xl border border-slate-200 border-l-[3px] border-l-sky-500 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left">
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">국가</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">운송수단</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">기본 (시드)</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">내 보정 (일)</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((d) => {
              const k = keyOf(d.origin_country, d.method)
              const hasOverride = k in overrides
              const busy = busyKey === k
              const countryLabel = COUNTRY_LABEL[d.origin_country] ?? d.origin_country
              const methodLabel = METHOD_LABEL[d.method] ?? d.method
              const range =
                d.min_transit_days != null && d.max_transit_days != null
                  ? `${d.min_transit_days}~${d.max_transit_days}일`
                  : null
              return (
                <tr key={k} className={`transition-colors ${hasOverride ? 'bg-indigo-50/40' : 'hover:bg-slate-50/60'}`}>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="text-sm font-medium text-slate-900">{countryLabel}</span>
                    <span className="ml-1 text-[10px] text-slate-400">{d.origin_country}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{methodLabel}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap tabular-nums">
                    {d.avg_transit_days}일
                    {range && <span className="text-slate-400 ml-1">({range})</span>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <input
                      type="number"
                      min={1}
                      max={120}
                      inputMode="numeric"
                      value={drafts[k] ?? ''}
                      placeholder={String(d.avg_transit_days)}
                      aria-label={`${countryLabel} ${methodLabel} 운송일수 보정 (일, 기본 ${d.avg_transit_days}일)`}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [k]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') save(d.origin_country, d.method)
                      }}
                      className="w-20 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={busy || (drafts[k] ?? '') === ''}
                        onClick={() => save(d.origin_country, d.method)}
                        aria-busy={busy}
                        aria-label={`${countryLabel} ${methodLabel} 운송일수 보정 저장`}
                        className="inline-flex items-center rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {busy ? '...' : '저장'}
                      </button>
                      {hasOverride && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => clear(d.origin_country, d.method)}
                          aria-busy={busy}
                          aria-label={`${countryLabel} ${methodLabel} 보정 초기화 (글로벌 시드값으로 복귀)`}
                          className="inline-flex items-center rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                          title="글로벌 시드값으로 복귀"
                        >
                          초기화
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
