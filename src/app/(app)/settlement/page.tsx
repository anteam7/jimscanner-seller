import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '배대지 정산 대조 · 짐스캐너 SELLER',
  description: '배대지별 예측 매입가 대비 실 청구 금액 차이를 한눈에.',
  robots: { index: false, follow: false },
}

type OrderRow = {
  id: string
  forwarder_id: string | null
  estimated_cost_krw: number | null
  actual_cost_krw: number | null
  status: string
  order_date: string | null
  forwarders: { name: string } | null
}

type PeriodKey = '30d' | '90d' | '180d' | 'all'

const PERIODS: Array<{ key: PeriodKey; label: string; days: number | null }> = [
  { key: '30d', label: '최근 30일', days: 30 },
  { key: '90d', label: '최근 90일', days: 90 },
  { key: '180d', label: '최근 180일', days: 180 },
  { key: 'all', label: '전체', days: null },
]

// 차이 임계값 — 예측 대비 ±15% 초과 시 주의 플래그
const VARIANCE_FLAG_PCT = 15

function formatKRW(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return '—'
  return '₩' + Math.round(Number(v)).toLocaleString('ko-KR')
}

function formatSignedKRW(v: number): string {
  const sign = v > 0 ? '+' : v < 0 ? '−' : ''
  return sign + '₩' + Math.abs(Math.round(v)).toLocaleString('ko-KR')
}

type ForwarderAgg = {
  forwarderId: string | null
  name: string
  orders: number
  estSumAll: number // 예측 합계 (estimated 있는 전체)
  reconcilable: number // 예측·실청구 둘 다 있는 건수
  estSumRecon: number
  actualSumRecon: number
  missingActual: number // 예측은 있으나 실청구 미입력
}

export default async function SettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const params = await searchParams
  const periodKey: PeriodKey = (PERIODS.find((p) => p.key === params.period)?.key) ?? '90d'
  const period = PERIODS.find((p) => p.key === periodKey)!

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return <div className="p-8"><p className="text-sm text-slate-600">로그인이 필요합니다.</p></div>
  }
  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) {
    return <div className="p-8"><p className="text-sm text-slate-600">사업자 계정이 없습니다.</p></div>
  }

  let query = sb
    .from('b2b_orders')
    .select(
      'id, forwarder_id, estimated_cost_krw, actual_cost_krw, status, order_date, forwarders(name)',
    )
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .neq('status', 'cancelled')
    .order('order_date', { ascending: false })
    .limit(2000)

  if (period.days != null) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - period.days)
    query = query.gte('order_date', cutoff.toISOString().slice(0, 10))
  }

  const { data: ordersRaw } = await query
  const orders = (ordersRaw ?? []) as unknown as OrderRow[]

  // 배대지별 집계
  const aggMap = new Map<string, ForwarderAgg>()
  for (const o of orders) {
    const key = o.forwarder_id ?? '__none__'
    let agg = aggMap.get(key)
    if (!agg) {
      agg = {
        forwarderId: o.forwarder_id,
        name: o.forwarders?.name ?? '배대지 미지정',
        orders: 0,
        estSumAll: 0,
        reconcilable: 0,
        estSumRecon: 0,
        actualSumRecon: 0,
        missingActual: 0,
      }
      aggMap.set(key, agg)
    }
    agg.orders += 1
    const est = o.estimated_cost_krw == null ? null : Number(o.estimated_cost_krw)
    const act = o.actual_cost_krw == null ? null : Number(o.actual_cost_krw)
    if (est != null && Number.isFinite(est)) agg.estSumAll += est
    if (est != null && Number.isFinite(est) && act != null && Number.isFinite(act)) {
      agg.reconcilable += 1
      agg.estSumRecon += est
      agg.actualSumRecon += act
    } else if (est != null && Number.isFinite(est) && act == null) {
      agg.missingActual += 1
    }
  }

  const aggs = Array.from(aggMap.values()).sort((a, b) => b.estSumAll - a.estSumAll)

  // 전체 합계 (대조 가능분 기준)
  const totalEstRecon = aggs.reduce((s, a) => s + a.estSumRecon, 0)
  const totalActualRecon = aggs.reduce((s, a) => s + a.actualSumRecon, 0)
  const totalReconcilable = aggs.reduce((s, a) => s + a.reconcilable, 0)
  const totalMissing = aggs.reduce((s, a) => s + a.missingActual, 0)
  const totalVariance = totalActualRecon - totalEstRecon
  const totalVariancePct = totalEstRecon > 0 ? (totalVariance / totalEstRecon) * 100 : null

  const hasData = orders.length > 0

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            <span className="bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">
              배대지 정산 대조
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            배대지별 <span className="font-medium text-slate-800">예측 매입가</span> 대비{' '}
            <span className="font-medium text-slate-800">실 결제 금액</span> 차이.{' '}
            <span className="font-semibold text-slate-900">{period.label}</span> · 주문{' '}
            <span className="font-semibold text-slate-900">{orders.length}건</span>.
          </p>
        </div>
        {/* 기간 프리셋 */}
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => {
            const active = p.key === periodKey
            return (
              <Link
                key={p.key}
                href={`/settlement?period=${p.key}`}
                prefetch={false}
                className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </Link>
            )
          })}
        </div>
      </header>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          label="대조 가능 예측"
          value={formatKRW(totalEstRecon)}
          tone="indigo"
          hint={`${totalReconcilable}건 (예측·실청구 모두 입력)`}
        />
        <Kpi label="실 청구 합계" value={formatKRW(totalActualRecon)} tone="sky" hint="대조 가능분 실 결제" />
        <Kpi
          label="차이"
          value={hasData && totalReconcilable > 0 ? formatSignedKRW(totalVariance) : '—'}
          tone={totalVariance > 0 ? 'rose' : 'emerald'}
          hint={
            totalVariancePct == null
              ? '대조 가능 건 없음'
              : `${totalVariancePct > 0 ? '+' : ''}${totalVariancePct.toFixed(1)}% ${
                  totalVariance > 0 ? '초과 청구' : totalVariance < 0 ? '절감' : '일치'
                }`
          }
        />
        <Kpi
          label="실청구 미입력"
          value={String(totalMissing)}
          tone="amber"
          hint="예측만 있고 실 결제 미기록"
        />
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">이 기간에 집계할 주문이 없습니다.</p>
          <p className="mt-1 text-xs text-slate-500">
            주문 상세에서 <span className="font-medium">예상 매입 KRW</span>·
            <span className="font-medium">실 결제 KRW</span>를 입력하면 정산 대조가 채워집니다.
          </p>
          <Link
            href="/orders"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            주문 목록으로
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left">
                  <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">배대지</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-right whitespace-nowrap">주문</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-right whitespace-nowrap">대조 가능</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-right whitespace-nowrap">예측 (대조분)</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-right whitespace-nowrap">실 청구 (대조분)</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-right whitespace-nowrap">차이</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-right whitespace-nowrap">미입력</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {aggs.map((a) => {
                  const variance = a.actualSumRecon - a.estSumRecon
                  const variancePct = a.estSumRecon > 0 ? (variance / a.estSumRecon) * 100 : null
                  const flagged = variancePct != null && Math.abs(variancePct) > VARIANCE_FLAG_PCT
                  return (
                    <tr key={a.forwarderId ?? '__none__'} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        {a.forwarderId ? (
                          <Link
                            href={`/orders?forwarder=${a.forwarderId}`}
                            className="font-medium text-indigo-700 hover:text-indigo-900 hover:underline inline-flex items-center gap-1"
                            title={`${a.name} 주문 목록 보기`}
                          >
                            {a.name}
                            <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          </Link>
                        ) : (
                          <span className="font-medium text-slate-500 italic">{a.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{a.orders}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{a.reconcilable}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {a.reconcilable > 0 ? formatKRW(a.estSumRecon) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {a.reconcilable > 0 ? formatKRW(a.actualSumRecon) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        {a.reconcilable === 0 || variancePct == null ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              flagged
                                ? variance > 0
                                  ? 'text-rose-700'
                                  : 'text-amber-700'
                                : variance > 0
                                  ? 'text-slate-700'
                                  : 'text-emerald-700'
                            }`}
                          >
                            {formatSignedKRW(variance)}
                            <span className="text-[10px] font-medium opacity-80">
                              ({variancePct > 0 ? '+' : ''}{variancePct.toFixed(1)}%)
                            </span>
                            {flagged && (
                              <span
                                className="ml-0.5 inline-flex items-center rounded bg-amber-50 px-1 py-0.5 text-[9px] font-medium text-amber-700 border border-amber-200"
                                title={`예측 대비 ${VARIANCE_FLAG_PCT}% 초과 차이`}
                              >
                                주의
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {a.missingActual > 0 ? (
                          <span className="text-amber-700 font-medium">{a.missingActual}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr className="font-semibold text-slate-900">
                  <td className="px-4 py-3">합계</td>
                  <td className="px-4 py-3 text-right tabular-nums">{orders.length}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totalReconcilable}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totalReconcilable > 0 ? formatKRW(totalEstRecon) : '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totalReconcilable > 0 ? formatKRW(totalActualRecon) : '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                    {totalReconcilable > 0 && totalVariancePct != null ? (
                      <span className={totalVariance > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                        {formatSignedKRW(totalVariance)}
                        <span className="ml-1 text-[10px] font-medium opacity-80">
                          ({totalVariancePct > 0 ? '+' : ''}{totalVariancePct.toFixed(1)}%)
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{totalMissing}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 마켓플레이스별 보조 안내 — 미입력이 있을 때만 */}
      {hasData && totalMissing > 0 && (
        <div className="rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 text-xs text-amber-800 leading-relaxed">
          <p className="font-semibold mb-1">⚠ 실 청구 미입력 {totalMissing}건</p>
          <p>
            배대지에서 실제 청구된 금액을 주문 상세의 <span className="font-medium">실 결제 KRW</span>에 입력하면 대조에
            반영됩니다. 미입력 주문은 예측·차이 계산에서 제외됩니다.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
        <p className="font-semibold text-slate-700 mb-1">계산 기준</p>
        <ul className="space-y-1 list-disc list-inside">
          <li><strong>예측 (대조분)</strong>: 예측·실청구가 <em>모두</em> 입력된 주문의 예상 매입 KRW 합계.</li>
          <li><strong>실 청구 (대조분)</strong>: 같은 주문들의 실 결제 KRW 합계.</li>
          <li><strong>차이</strong> = 실 청구 − 예측. 양수(+)는 예측보다 더 청구됨, 음수(−)는 절감.</li>
          <li>예측 대비 ±{VARIANCE_FLAG_PCT}% 초과 차이는 <span className="inline-flex items-center rounded bg-amber-50 px-1 py-0.5 text-[9px] font-medium text-amber-700 border border-amber-200 align-middle">주의</span> 플래그.</li>
          <li>취소 주문은 제외. 금액은 주문 상세에서 직접 입력한 값 기준.</li>
        </ul>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: string
  tone: 'indigo' | 'sky' | 'rose' | 'emerald' | 'amber'
  hint: string
}) {
  const toneCls: Record<typeof tone, { bar: string; num: string }> = {
    indigo: { bar: 'border-l-indigo-500', num: 'text-indigo-700' },
    sky: { bar: 'border-l-sky-500', num: 'text-sky-700' },
    rose: { bar: 'border-l-rose-500', num: 'text-rose-700' },
    emerald: { bar: 'border-l-emerald-500', num: 'text-emerald-700' },
    amber: { bar: 'border-l-amber-500', num: 'text-amber-700' },
  } as const
  return (
    <div className={`rounded-lg border border-slate-200 ${toneCls[tone].bar} border-l-[3px] bg-white p-3 shadow-sm`}>
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${toneCls[tone].num}`}>{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>
    </div>
  )
}
