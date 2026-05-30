import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'
import {
  applyTransitOverrides,
  buildEtaLookup,
  classifyEtaBucket,
  computeOrderEta,
  formatKstDate,
  normalizeOriginCountry,
  type SellerTransitOverride,
  type TransitDefault,
} from '@/lib/b2b/eta'
import {
  computeStorageStatus,
  DEFAULT_FREE_STORAGE_DAYS,
  type StorageStatus,
} from '@/lib/b2b/storage-deadline'
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

  const [{ data: defaultsRaw }, { data: overridesRaw }] = await Promise.all([
    sb
      .from('b2b_forwarder_transit_defaults')
      .select('origin_country, method, avg_transit_days, min_transit_days, max_transit_days')
      .eq('is_active', true),
    sb
      .from('b2b_seller_transit_overrides')
      .select('origin_country, method, avg_transit_days')
      .eq('account_id', account.id),
  ])
  const overrides = (overridesRaw ?? []) as SellerTransitOverride[]
  const lookup = applyTransitOverrides(
    buildEtaLookup((defaultsRaw ?? []) as TransitDefault[]),
    overrides,
  )
  // 보정이 실제 적용된 키 (현재 ETA 계산은 air 기준)
  const overrideKeys = new Set(
    overrides.map((o) => `${normalizeOriginCountry(o.origin_country)}|${o.method || 'air'}`),
  )

  const now = new Date()
  type Enriched = {
    order: OrderRow
    eta: Date
    days: number
    basis: 'forwarder_submitted' | 'order_date_estimated'
    bucket: 'overdue' | 'this_week' | 'next_week' | 'later'
    unknownCountry: boolean
    overridden: boolean
  }
  const enriched: Enriched[] = []
  for (const o of orders) {
    const { eta, days, basis, unknownCountry, country } = computeOrderEta(o, lookup)
    const bucket = classifyEtaBucket(eta, now)
    const overridden = overrideKeys.has(`${country}|air`)
    enriched.push({ order: o, eta, days, basis, bucket, unknownCountry, overridden })
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

  // #idea-14: 배대지 보관 기간 — 배대지 입고(forwarder_submitted)된 주문만
  // forwarder_submitted_at 기준 경과일로 무료 보관 만료 임박/초과 판정.
  const { data: storageRaw } = await sb
    .from('b2b_orders')
    .select(
      'id, order_number, market_order_number, marketplace, buyer_name, forwarder_country, forwarder_submitted_at, order_date, created_at, status',
    )
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .eq('status', 'forwarder_submitted')
    .not('forwarder_submitted_at', 'is', null)
    .order('forwarder_submitted_at', { ascending: true })
    .limit(300)
  type StorageEnriched = { order: OrderRow; storage: StorageStatus }
  const storageItems: StorageEnriched[] = []
  for (const o of (storageRaw ?? []) as OrderRow[]) {
    const storage = computeStorageStatus(o.forwarder_submitted_at, now)
    if (storage) storageItems.push({ order: o, storage })
  }
  // 경과일 많은 순 (위험한 것 위로)
  storageItems.sort((a, b) => b.storage.elapsedDays - a.storage.elapsedDays)
  const storageCounts = {
    over: storageItems.filter((s) => s.storage.level === 'over').length,
    warn: storageItems.filter((s) => s.storage.level === 'warn').length,
    total: storageItems.length,
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
          <Link
            href="/settings/transit"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-colors"
            title="국가별 운송일수를 본인 기준으로 보정"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            운송일수 보정
          </Link>
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

      {/* #idea-14: 배대지 보관 기간 — 입고된 주문이 있을 때만 */}
      {storageItems.length > 0 && (
        <StorageSection items={storageItems} counts={storageCounts} />
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
        <p className="font-semibold text-slate-700 mb-1">계산 기준</p>
        <ul className="space-y-1 list-disc list-inside">
          <li><strong>배대지 접수일 있는 경우</strong>: 접수일 + 국가별 항공 평균 운송일</li>
          <li><strong>없는 경우</strong>: 주문일 + 3일 (접수 buffer) + 평균 운송일</li>
          <li>국가별 평균은 <Link href="/resources/customs-guide" className="underline hover:text-indigo-700">시드값</Link> 기반 — 실제는 통관·세관·계절에 따라 ±5일 변동.</li>
          <li><span className="inline-flex items-center rounded bg-indigo-50 px-1 py-0.5 text-[9px] font-medium text-indigo-700 border border-indigo-200 align-middle">보정</span> 배지는 <Link href="/settings/transit" className="underline hover:text-indigo-700">내 운송일수 보정</Link>이 적용된 주문.</li>
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
  tone: 'rose' | 'indigo' | 'sky' | 'slate' | 'amber'
  hint: string
}) {
  const toneCls: Record<typeof tone, { bar: string; num: string }> = {
    rose:   { bar: 'border-l-rose-500',   num: 'text-rose-700' },
    indigo: { bar: 'border-l-indigo-500', num: 'text-indigo-700' },
    sky:    { bar: 'border-l-sky-500',    num: 'text-sky-700' },
    slate:  { bar: 'border-l-slate-400',  num: 'text-slate-700' },
    amber:  { bar: 'border-l-amber-500',  num: 'text-amber-700' },
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
    overridden: boolean
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
              const country = normalizeOriginCountry(e.order.forwarder_country)
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
                        {e.overridden && (
                          <span
                            className="ml-1 inline-flex items-center rounded bg-indigo-50 px-1 py-0.5 text-[9px] font-medium text-indigo-700 border border-indigo-200"
                            title="내 운송일수 보정 적용됨"
                          >
                            보정
                          </span>
                        )}
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

function StorageSection({
  items,
  counts,
}: {
  items: Array<{ order: OrderRow; storage: StorageStatus }>
  counts: { over: number; warn: number; total: number }
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h2 className="text-sm font-semibold text-slate-700">📦 배대지 보관 기간</h2>
        <p className="text-[11px] text-slate-500">
          배대지 입고 후 {DEFAULT_FREE_STORAGE_DAYS}일 무료 보관 기준 · 초과 시 보관비 발생 위험
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="초과" value={counts.over} tone="rose" hint={`무료 ${DEFAULT_FREE_STORAGE_DAYS}일 경과`} />
        <Kpi label="임박" value={counts.warn} tone="amber" hint="2일 이내 만료" />
        <Kpi label="입고 중" value={counts.total} tone="slate" hint="배대지 보관 중 전체" />
      </div>
      <div className="rounded-xl border border-slate-200 border-l-amber-500 border-l-[3px] bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left">
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">경과</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">남은 무료일</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">주문</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">접수일</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((e) => {
              const marketLabel = e.order.marketplace
                ? MARKETPLACE_LABEL[e.order.marketplace] ?? e.order.marketplace
                : null
              const tone =
                e.storage.level === 'over'
                  ? { badge: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700' }
                  : e.storage.level === 'warn'
                    ? { badge: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700' }
                    : { badge: 'bg-slate-50 text-slate-600 border-slate-200', text: 'text-slate-600' }
              return (
                <tr key={e.order.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${tone.badge}`}>
                      {e.storage.level === 'over'
                        ? '보관비 위험'
                        : e.storage.level === 'warn'
                          ? '임박'
                          : '보관 중'}
                    </span>
                    <span className="ml-1.5 text-xs text-slate-500 tabular-nums">{e.storage.elapsedDays}일째</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs tabular-nums whitespace-nowrap">
                    {e.storage.remainingDays <= 0 ? (
                      <span className="text-rose-700 font-semibold">
                        {Math.abs(e.storage.remainingDays)}일 초과
                      </span>
                    ) : (
                      <span className={tone.text}>{e.storage.remainingDays}일 남음</span>
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
                  <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap tabular-nums">
                    {e.order.forwarder_submitted_at
                      ? formatKstDate(new Date(e.order.forwarder_submitted_at))
                      : '—'}
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
      <p className="text-[11px] text-slate-500">
        무료 보관일은 배대지마다 다릅니다(보통 7~30일). 위 기준은 가장 보수적인 {DEFAULT_FREE_STORAGE_DAYS}일이며,
        실제 청구는 배대지 정책을 따릅니다. 한국 출고(운송 중) 전환 시 목록에서 제외됩니다.
      </p>
    </section>
  )
}
