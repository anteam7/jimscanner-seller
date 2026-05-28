import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'
import {
  buildEtaLookup,
  classifyEtaBucket,
  computeOrderEta,
  formatKstDate,
  type TransitDefault,
} from '@/lib/b2b/eta'
import { MARKETPLACES } from '@/lib/b2b/order-options'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '도착 예정 (ETA) · 짐스캐너 SELLER',
  description: '배대지 통관·운송 평균치 기반 주문 도착 예정일 캘린더.',
  robots: { index: false, follow: false },
}

const MARKETPLACE_LABEL: Record<string, string> = Object.fromEntries(
  MARKETPLACES.map((m) => [m.value, m.label]),
)

const COUNTRY_LABEL: Record<string, string> = {
  US: '미국', JP: '일본', CN: '중국', UK: '영국', DE: '독일',
  FR: '프랑스', IT: '이탈리아', ES: '스페인', AU: '호주',
  CA: '캐나다', HK: '홍콩', TW: '대만', SG: '싱가포르',
  VN: '베트남', TH: '태국', OTHER: '기타',
}

type OrderRow = {
  id: string
  order_number: string
  market_order_number: string | null
  marketplace: string | null
  buyer_name: string | null
  forwarder_country: string | null
  forwarder_submitted_at: string | null
  order_date: string | null
  created_at: string
  status: string
}

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  pending: '대기',
  paid: '결제완료',
  purchasing: '매입중',
  shipping: '배송중',
  delivered: '도착',
  completed: '완료',
  refund_requested: '환불요청',
  cancelled: '취소',
}

export default async function EtaPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
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

  // ETA 계산 대상: 도착 안 한 주문만 (delivered/completed/cancelled 제외)
  const ACTIVE_STATUS = ['draft', 'pending', 'paid', 'purchasing', 'shipping', 'refund_requested']

  const { data: ordersRaw } = await sb
    .from('b2b_orders')
    .select(
      'id, order_number, market_order_number, marketplace, buyer_name, forwarder_country, forwarder_submitted_at, order_date, created_at, status',
    )
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .in('status', ACTIVE_STATUS)
    .order('created_at', { ascending: false })
    .limit(300)
  const orders = (ordersRaw ?? []) as OrderRow[]

  const { data: defaultsRaw } = await sb
    .from('b2b_forwarder_transit_defaults')
    .select('origin_country, method, avg_transit_days, min_transit_days, max_transit_days')
    .eq('is_active', true)
  const lookup = buildEtaLookup((defaultsRaw ?? []) as TransitDefault[])

  const now = new Date()
  type Enriched = {
    order: OrderRow
    eta: Date
    days: number
    basis: 'forwarder_submitted' | 'order_date_estimated'
    bucket: 'overdue' | 'this_week' | 'next_week' | 'later'
    unknownCountry: boolean
  }
  const enriched: Enriched[] = []
  for (const o of orders) {
    const { eta, days, basis, unknownCountry } = computeOrderEta(o, lookup)
    const bucket = classifyEtaBucket(eta, now)
    enriched.push({ order: o, eta, days, basis, bucket, unknownCountry })
  }

  // bucket 별 그룹화
  const groups: Record<Enriched['bucket'], Enriched[]> = {
    overdue: [],
    this_week: [],
    next_week: [],
    later: [],
  }
  for (const e of enriched) groups[e.bucket].push(e)
  // 각 그룹은 ETA 빠른 순
  for (const k of Object.keys(groups) as Enriched['bucket'][]) {
    groups[k].sort((a, b) => a.eta.getTime() - b.eta.getTime())
  }

  const totalActive = enriched.length
  const counts = {
    overdue: groups.overdue.length,
    this_week: groups.this_week.length,
    next_week: groups.next_week.length,
    later: groups.later.length,
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            <span className="bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
              도착 예정 (ETA)
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            배대지·국가별 평균 운송일수로 계산. 총{' '}
            <span className="font-semibold text-slate-900">{totalActive}건</span> 진행중.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/eta/ics"
            download="jimscanner-eta.ics"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-colors"
            title="캘린더 앱에서 import"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            ICS 캘린더
          </a>
        </div>
      </header>

      {/* 4 KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="지연" value={counts.overdue} tone="rose" hint="ETA 지남" />
        <Kpi label="이번 주" value={counts.this_week} tone="indigo" hint="이번 주 도착 예정" />
        <Kpi label="다음 주" value={counts.next_week} tone="sky" hint="다음 주 도착 예정" />
        <Kpi label="이후" value={counts.later} tone="slate" hint="2주 이후" />
      </div>

      {/* 그룹 목록 */}
      <Section title="🔴 지연 (ETA 경과)" items={groups.overdue} tone="rose" />
      <Section title="🗓️ 이번 주" items={groups.this_week} tone="indigo" />
      <Section title="📅 다음 주" items={groups.next_week} tone="sky" />
      <Section title="🌐 그 이후" items={groups.later} tone="slate" collapsedDefault />

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
        <p className="font-semibold text-slate-700 mb-1">계산 기준</p>
        <ul className="space-y-1 list-disc list-inside">
          <li><strong>배대지 접수일 있는 경우</strong>: 접수일 + 국가별 항공 평균 운송일</li>
          <li><strong>없는 경우</strong>: 주문일 + 3일 (접수 buffer) + 평균 운송일</li>
          <li>국가별 평균은 <Link href="/resources" className="underline hover:text-indigo-700">시드값</Link> 기반 — 실제는 통관·세관·계절에 따라 ±5일 변동.</li>
        </ul>
      </div>
    </div>
  )
}

function Kpi({
  label, value, tone, hint,
}: {
  label: string
  value: number
  tone: 'rose' | 'indigo' | 'sky' | 'slate'
  hint: string
}) {
  const toneCls: Record<typeof tone, { bar: string; num: string }> = {
    rose:   { bar: 'border-l-rose-500',   num: 'text-rose-700' },
    indigo: { bar: 'border-l-indigo-500', num: 'text-indigo-700' },
    sky:    { bar: 'border-l-sky-500',    num: 'text-sky-700' },
    slate:  { bar: 'border-l-slate-400',  num: 'text-slate-700' },
  } as const
  return (
    <div className={`rounded-lg border border-slate-200 ${toneCls[tone].bar} border-l-[3px] bg-white p-3 shadow-sm`}>
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${toneCls[tone].num}`}>{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>
    </div>
  )
}

function Section({
  title,
  items,
  tone,
  collapsedDefault,
}: {
  title: string
  items: Array<{
    order: OrderRow
    eta: Date
    days: number
    basis: 'forwarder_submitted' | 'order_date_estimated'
    bucket: 'overdue' | 'this_week' | 'next_week' | 'later'
    unknownCountry: boolean
  }>
  tone: 'rose' | 'indigo' | 'sky' | 'slate'
  collapsedDefault?: boolean
}) {
  if (items.length === 0) return null
  const toneCls = {
    rose:   'border-l-rose-500',
    indigo: 'border-l-indigo-500',
    sky:    'border-l-sky-500',
    slate:  'border-l-slate-300',
  }[tone]
  return (
    <details open={!collapsedDefault} className="group">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 py-2">
        <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        {title}
        <span className="ml-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 tabular-nums">
          {items.length}
        </span>
      </summary>
      <div className={`mt-2 rounded-xl border border-slate-200 ${toneCls} border-l-[3px] bg-white shadow-sm overflow-hidden`}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left">
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ETA</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">남은 일수</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">주문</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">국가/상태</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((e) => {
              const now = new Date()
              const dayMs = 24 * 60 * 60 * 1000
              const remaining = Math.round((e.eta.getTime() - now.getTime()) / dayMs)
              const marketLabel = e.order.marketplace ? MARKETPLACE_LABEL[e.order.marketplace] ?? e.order.marketplace : null
              const country = e.order.forwarder_country ?? 'OTHER'
              const countryLabel = COUNTRY_LABEL[country] ?? country
              return (
                <tr key={e.order.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap tabular-nums">
                    {formatKstDate(e.eta)}
                    {e.basis === 'order_date_estimated' && (
                      <span className="ml-1.5 inline-flex items-center rounded bg-amber-50 px-1 py-0.5 text-[9px] font-medium text-amber-700 border border-amber-200">
                        추정
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                    {remaining < 0 ? (
                      <span className="text-rose-700 font-semibold">{Math.abs(remaining)}일 지연</span>
                    ) : remaining === 0 ? (
                      <span className="text-indigo-700 font-semibold">오늘</span>
                    ) : (
                      <span>{remaining}일 후</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-800">
                    <Link href={`/orders/${e.order.id}`} prefetch={false} className="hover:text-indigo-700 transition-colors">
                      <p className="font-medium text-slate-900 text-sm">
                        {e.order.market_order_number ?? e.order.order_number}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {marketLabel && <span className="mr-1.5">{marketLabel}</span>}
                        {e.order.buyer_name ?? '—'}
                      </p>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-slate-700">
                        {countryLabel}
                        {e.unknownCountry && (
                          <span className="ml-1 text-amber-600" title="국가 미설정 — 기본값 적용">⚠</span>
                        )}
                        <span className="text-slate-400 ml-1">· {e.days}일</span>
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {STATUS_LABEL[e.order.status] ?? e.order.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <Link
                      href={`/orders/${e.order.id}`}
                      prefetch={false}
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-900"
                    >
                      상세
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </details>
  )
}
