'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatKRW } from '@/lib/b2b/format'
import type { WeeklyDigest, DigestSnapshot } from '@/lib/b2b/weekly-digest'

function rangeLabel(s: DigestSnapshot): string {
  // YYYY-MM-DD → M/D
  const fmt = (k: string) => {
    const [, m, d] = k.split('-')
    return `${Number(m)}/${Number(d)}`
  }
  return `${fmt(s.startKst)}~${fmt(s.endKst)}`
}

function WowChip({ pct }: { pct: number | null }) {
  if (pct == null) {
    return (
      <span className="text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
        전주 데이터 없음
      </span>
    )
  }
  const flat = Math.abs(pct) < 0.5
  const positive = pct >= 0
  const tone = flat
    ? 'text-slate-500 bg-slate-50 border-slate-200'
    : positive
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : 'text-rose-700 bg-rose-50 border-rose-200'
  const arrow = flat ? '–' : positive ? '▲' : '▼'
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold border rounded px-1.5 py-0.5 tabular-nums ${tone}`}>
      {arrow} {Math.abs(pct).toFixed(pct >= 100 || pct <= -100 ? 0 : 1)}%
      <span className="text-[9px] font-medium opacity-70 ml-0.5">전주比</span>
    </span>
  )
}

function Metric({
  label,
  value,
  accent,
  wowPct,
  partial,
  href,
}: {
  label: string
  value: string
  accent: 'indigo' | 'emerald' | 'sky' | 'rose'
  wowPct?: number | null
  partial: boolean
  href?: string
}) {
  const valueColor = {
    indigo: 'text-indigo-700',
    emerald: 'text-emerald-700',
    sky: 'text-sky-700',
    rose: 'text-rose-700',
  }[accent]
  const inner = (
    <>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${valueColor}`}>{value}</p>
      {!partial && wowPct !== undefined && (
        <div className="mt-1.5">
          <WowChip pct={wowPct ?? null} />
        </div>
      )}
    </>
  )
  const cls =
    'block rounded-lg border border-slate-200 bg-white px-3.5 py-3 transition-shadow'
  return href ? (
    <Link href={href} className={`${cls} hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  )
}

export default function WeeklyDigestCard({ digest }: { digest: WeeklyDigest }) {
  const [view, setView] = useState<'last' | 'this'>('last')
  const snap = view === 'last' ? digest.lastWeek : digest.thisWeek

  const marginValue = snap.marginKnown ? formatKRW(Math.round(snap.marginKrw)) : '—'
  const marginAccent: 'emerald' | 'rose' | 'sky' = !snap.marginKnown
    ? 'sky'
    : snap.marginKrw >= 0
      ? 'emerald'
      : 'rose'
  const marginRateLabel =
    snap.marginRate != null ? `마진율 ${snap.marginRate.toFixed(1)}%` : '환율 환산 필요'

  const opNotes: { label: string; href: string; tone: 'amber' | 'emerald' }[] = []
  if (snap.unmatchedReceipts > 0)
    opNotes.push({ label: `미매칭 영수증 ${snap.unmatchedReceipts}건`, href: '/imports', tone: 'amber' })
  if (snap.pendingPurchase > 0)
    opNotes.push({ label: `매입 미진행 ${snap.pendingPurchase}건`, href: '/orders?status=pending', tone: 'amber' })
  if (snap.arrived > 0)
    opNotes.push({ label: `도착·완료 ${snap.arrived}건`, href: '/orders', tone: 'emerald' })

  return (
    <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-indigo-500 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <span>🗓️</span> 주간 운영 요약
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
            {rangeLabel(snap)} (KST)
            {snap.partial && <span className="ml-1 text-indigo-600 font-medium">· 진행 중</span>}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs" role="group" aria-label="주간 선택">
          <button
            type="button"
            onClick={() => setView('last')}
            aria-pressed={view === 'last'}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              view === 'last' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            지난주
          </button>
          <button
            type="button"
            onClick={() => setView('this')}
            aria-pressed={view === 'this'}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              view === 'this' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            이번주
          </button>
        </div>
      </div>

      <div className="px-5 pb-4">
        {snap.orderCount === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            {snap.partial ? '이번 주 등록된 주문이 아직 없습니다.' : '지난주 등록된 주문이 없습니다.'}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              <Metric
                label="신규 주문"
                value={`${snap.orderCount.toLocaleString('ko-KR')}건`}
                accent="indigo"
                wowPct={snap.wowOrdersPct}
                partial={snap.partial}
                href="/orders"
              />
              <Metric
                label="판매액"
                value={snap.saleKrw > 0 ? formatKRW(Math.round(snap.saleKrw)) : '—'}
                accent="emerald"
                wowPct={snap.wowSalePct}
                partial={snap.partial}
                href="/analytics"
              />
              <Metric
                label="매입액"
                value={snap.purchaseKrw > 0 ? formatKRW(Math.round(snap.purchaseKrw)) : '—'}
                accent="sky"
                partial={snap.partial}
                href="/analytics"
              />
              <Metric
                label="예상 마진"
                value={marginValue}
                accent={marginAccent}
                wowPct={snap.wowMarginPct}
                partial={snap.partial}
                href="/analytics"
              />
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
              <p className="text-[11px] text-slate-500">
                {snap.marginKnown ? marginRateLabel : '마진은 환율 환산된 주문만 집계'}
              </p>
              {opNotes.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {opNotes.map((n) => (
                    <Link
                      key={n.label}
                      href={n.href}
                      className={`inline-flex items-center text-[10px] font-medium border rounded px-1.5 py-0.5 transition-colors ${
                        n.tone === 'amber'
                          ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                          : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {n.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
