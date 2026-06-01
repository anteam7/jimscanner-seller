/**
 * #idea-22 — SKU 매입가 추세 (서버 컴포넌트, /products/[id]).
 * 통화별로 평균/최저/최고 + 최근 vs 평균 델타% 를 보여주고, 인상률이
 * PRICE_HIKE_WARN_PCT 를 넘으면 amber 경고. 매입가는 환산 없이 통화별로만 집계.
 */
import {
  type CurrencyTrend,
  PRICE_HIKE_WARN_PCT,
} from '@/lib/b2b/sku-price-trend'
import { formatForeign, formatDate } from '@/lib/b2b/format'

function TrendSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min
  const W = 160
  const H = 36
  const stepX = W / (values.length - 1)
  const points = values.map((v, i) => {
    const x = i * stepX
    const y = range === 0 ? H / 2 : H - ((v - min) / range) * (H - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const lastX = (values.length - 1) * stepX
  const lastY =
    range === 0 ? H / 2 : H - ((values[values.length - 1] - min) / range) * (H - 4) - 2
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="overflow-visible"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-sky-500"
        points={points.join(' ')}
      />
      <circle cx={lastX} cy={lastY} r={2.5} className="fill-sky-600" />
    </svg>
  )
}

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct == null) return null
  const hike = pct > PRICE_HIKE_WARN_PCT
  const flat = Math.abs(pct) < 0.5
  const positive = pct >= 0
  const tone = hike
    ? 'text-amber-800 bg-amber-50 border-amber-300'
    : flat
      ? 'text-slate-500 bg-slate-50 border-slate-200'
      : positive
        ? 'text-rose-700 bg-rose-50 border-rose-200'
        : 'text-emerald-700 bg-emerald-50 border-emerald-200'
  const arrow = flat ? '–' : positive ? '▲' : '▼'
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold border rounded px-1.5 py-0.5 tabular-nums ${tone}`}
    >
      {arrow} {Math.abs(pct).toFixed(1)}%
      <span className="text-[10px] font-medium opacity-70 ml-0.5">평균比</span>
    </span>
  )
}

function CurrencyCard({ t }: { t: CurrencyTrend }) {
  const hike = t.deltaPct != null && t.deltaPct > PRICE_HIKE_WARN_PCT
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{t.currency}</span>
            <span className="text-[11px] text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
              매입 {t.count}건
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            최근 {formatDate(t.recentDate)} · {formatForeign(t.recent, t.currency)}
          </p>
        </div>
        <DeltaBadge pct={t.deltaPct} />
      </div>

      {t.points.length > 1 && (
        <div className="flex items-end">
          <TrendSparkline values={t.points.map((p) => p.price)} />
        </div>
      )}

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-slate-50 px-2 py-1.5">
          <dt className="text-[10px] text-slate-500">평균</dt>
          <dd className="text-xs font-semibold text-slate-900 tabular-nums mt-0.5">
            {formatForeign(Math.round(t.avg * 100) / 100, t.currency)}
          </dd>
        </div>
        <div className="rounded-md bg-slate-50 px-2 py-1.5">
          <dt className="text-[10px] text-slate-500">최저</dt>
          <dd className="text-xs font-semibold text-emerald-700 tabular-nums mt-0.5">
            {formatForeign(t.min, t.currency)}
          </dd>
        </div>
        <div className="rounded-md bg-slate-50 px-2 py-1.5">
          <dt className="text-[10px] text-slate-500">최고</dt>
          <dd className="text-xs font-semibold text-slate-700 tabular-nums mt-0.5">
            {formatForeign(t.max, t.currency)}
          </dd>
        </div>
      </dl>

      {hike && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 leading-relaxed">
          ⚠ 최근 매입가가 평균보다 {t.deltaPct!.toFixed(1)}% 높습니다. 매입처 가격을 확인하거나 판매가를 조정해 마진을 지키세요.
        </p>
      )}
    </div>
  )
}

export default function SkuPriceTrend({ trends }: { trends: CurrencyTrend[] }) {
  return (
    <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-sky-500 bg-white shadow-sm p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">매입가 추세</h2>
        <p className="text-xs text-slate-500 mt-1">
          이 SKU 가 실제 주문에서 매입된 단가 기록입니다. 통화별로 평균·최저·최고와 최근 인상폭을 보여줍니다.
        </p>
      </div>

      {trends.length === 0 ? (
        <p className="text-xs text-slate-500 bg-slate-50 rounded-md px-3 py-4 text-center">
          아직 이 SKU 로 매입한 주문 기록이 없습니다. 주문을 등록하면 매입가 추세가 쌓입니다.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {trends.map((t) => (
            <CurrencyCard key={t.currency} t={t} />
          ))}
        </div>
      )}
    </section>
  )
}
