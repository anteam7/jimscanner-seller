import type { Metadata } from 'next'
import Link from 'next/link'
import { getExchangeRates, type ExchangeRates } from '@/lib/b2b/exchange-rate'
import { MARKETPLACES } from '@/lib/b2b/order-options'
import { getDashboardStats } from '@/lib/b2b/dashboard-data'
import { createClient } from '@/lib/auth/server'
import type { SellerAccount } from '@/components/b2b/SellerShell'
import QuotaBanner from '@/components/b2b/QuotaBanner'

export const metadata: Metadata = {
  title: '대시보드',
  robots: { index: false },
}

type FullAccount = SellerAccount & {
  ceo_name: string | null
  business_no: string | null
}

const NEXT_ACTION: Record<number, { label: string; hint: string; href?: string }> = {
  0: {
    label: '이메일 인증 완료',
    hint: '가입 시 발송된 이메일 링크를 클릭하면 다음 단계로 진행됩니다.',
  },
  1: {
    label: '사업자 정보 입력',
    hint: '사업자등록번호와 상호 등을 입력하면 자동으로 진위 확인이 진행됩니다.',
    href: '/signup/step-4',
  },
  2: {
    label: '사업자등록증 업로드',
    hint: '서류 업로드 후 영업일 1~2일 이내에 운영팀이 검토합니다.',
    href: '/signup/step-6',
  },
}

function StatusBanner({ account }: { account: FullAccount }) {
  if (account.suspended_at) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 shadow-sm">
        <p className="text-sm font-semibold text-red-700">계정이 정지되었습니다</p>
        <p className="text-xs text-red-600 mt-1">
          자세한 사항은 support@jimscanner.co.kr 로 문의해 주세요.
        </p>
      </div>
    )
  }

  if (account.verification_level >= 3) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-5 py-4 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-500/30">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-900">
            인증 완료 — 모든 기능을 사용할 수 있습니다
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            {account.business_name ? `${account.business_name} · ` : ''}
            {account.email}
          </p>
        </div>
      </div>
    )
  }

  const next = NEXT_ACTION[account.verification_level]
  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white px-5 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-amber-500/30">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">계정 검증 진행 중</p>
          <p className="text-xs text-slate-700 mt-1">
            다음 단계:{' '}
            <span className="font-semibold text-amber-900">{next?.label}</span>
            {next?.hint ? ` — ${next.hint}` : ''}
          </p>
          {next?.href && (
            <Link
              href={next.href}
              className="inline-flex items-center gap-1 mt-2.5 text-xs font-semibold text-amber-800 hover:text-amber-900 transition-colors"
            >
              지금 완료하기
              <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m3 2.5 4 3.5-4 3.5" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function VerificationProgress({ level }: { level: number }) {
  const steps = [
    { label: '이메일', done: level >= 1 },
    { label: '사업자 정보', done: level >= 2 },
    { label: '서류 업로드', done: level >= 2 },
    { label: '검토 완료', done: level >= 3 },
  ]

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
        인증 진행 현황
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                ${step.done
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
            >
              {step.done ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                </svg>
              ) : (
                <span className="w-3 h-3 flex items-center justify-center">{i + 1}</span>
              )}
              {step.label}
            </div>
            {i < steps.length - 1 && (
              <span className="text-slate-300 text-xs">›</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function OnboardingGuide() {
  return (
    <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-sky-50 shadow-sm overflow-hidden">
      <div className="px-6 pt-6 pb-2">
        <span className="inline-flex items-center gap-1.5 mb-2 rounded-full bg-white border border-indigo-200 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          START GUIDE
        </span>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          첫 주문 등록까지 3단계
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          한 번 셋업해 두면 다음 주문부터 모든 정보가 자동으로 채워집니다.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-6 py-5">
        <OnboardingStep
          step="1"
          color="emerald"
          title="상품 SKU 등록"
          desc="반복 주문되는 상품을 미리 등록. 매입처·단가·배대지 default 까지."
          href="/products/new"
          cta="SKU 등록"
          optional
        />
        <OnboardingStep
          step="2"
          color="sky"
          title="첫 주문 입력"
          desc="마켓에서 받은 주문을 등록. SKU 가 있으면 자동 채움."
          href="/orders/new"
          cta="주문 등록 →"
        />
        <OnboardingStep
          step="3"
          color="indigo"
          title="배대지 양식 변환"
          desc="주문 상세에서 30+ 양식 중 선택 → xlsx 다운로드 → 배대지 제출."
          href="/templates"
          cta="양식 보기"
          optional
        />
      </div>
      <div className="px-6 pb-5">
        <p className="text-[11px] text-slate-500 text-center">
          ※ 2번부터 시작해도 됩니다. 사용하면서 자주 등장하는 상품을 SKU 로 정리하는 게 효율적입니다.
        </p>
      </div>
    </section>
  )
}

function OnboardingStep({
  step,
  color,
  title,
  desc,
  href,
  cta,
  optional,
}: {
  step: string
  color: 'emerald' | 'sky' | 'indigo'
  title: string
  desc: string
  href: string
  cta: string
  optional?: boolean
}) {
  const map = {
    emerald: { border: 'border-l-emerald-500', txt: 'text-emerald-700', bg: 'bg-emerald-50' },
    sky: { border: 'border-l-sky-500', txt: 'text-sky-700', bg: 'bg-sky-50' },
    indigo: { border: 'border-l-indigo-500', txt: 'text-indigo-700', bg: 'bg-indigo-50' },
  }
  const c = map[color]
  return (
    <div className={`rounded-xl border border-slate-200 border-l-[3px] ${c.border} bg-white p-4 flex flex-col h-full shadow-sm`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${c.bg} ${c.txt} text-xs font-bold`}>
          {step}
        </span>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {optional && (
          <span className="text-[10px] text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 ml-auto">
            선택
          </span>
        )}
      </div>
      <p className="text-xs text-slate-600 leading-relaxed flex-1 mb-3">{desc}</p>
      <Link
        href={href}
        className={`inline-flex items-center justify-center gap-1 ${c.bg} ${c.txt} hover:brightness-95 text-xs font-semibold rounded-md py-1.5 transition-all`}
      >
        {cta}
      </Link>
    </div>
  )
}

function StatCard({
  label,
  accent,
  value,
  sub,
  loading,
}: {
  label: string
  accent: 'indigo' | 'emerald' | 'sky'
  value?: string | null
  sub?: string | null
  loading?: boolean
}) {
  const accentMap = {
    indigo: 'from-indigo-50 to-white border-l-indigo-500',
    emerald: 'from-emerald-50 to-white border-l-emerald-500',
    sky: 'from-sky-50 to-white border-l-sky-500',
  }
  const valueColor = {
    indigo: 'text-indigo-700',
    emerald: 'text-emerald-700',
    sky: 'text-sky-700',
  }
  return (
    <div className={`rounded-xl border border-slate-200 border-l-[3px] bg-gradient-to-br ${accentMap[accent]} p-5 shadow-sm hover:shadow-md transition-shadow`}>
      <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
      {loading ? (
        <>
          <div className="h-8 w-20 bg-slate-100 rounded-md animate-pulse" />
          <div className="h-3 w-28 bg-slate-100 rounded-md mt-2 animate-pulse" />
        </>
      ) : (
        <>
          <p className={`text-2xl font-bold tabular-nums ${valueColor[accent]}`}>
            {value ?? '—'}
          </p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </>
      )}
    </div>
  )
}

function QuickActionCard({
  title,
  description,
  href,
  icon,
  available,
}: {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  available: boolean
}) {
  if (!available) {
    return (
      <div
        className="group rounded-xl border border-slate-200 bg-white shadow-sm p-5 cursor-not-allowed opacity-60"
        aria-disabled="true"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-500">{title}</p>
            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            <span className="inline-block mt-2 text-[10px] text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">준비 중</span>
          </div>
        </div>
      </div>
    )
  }
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 bg-white shadow-sm p-5 hover:shadow-md hover:border-indigo-200 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
        <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 mt-1 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </Link>
  )
}

export default async function SellerDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = (await (supabase as any)
    .from('b2b_accounts')
    .select(
      'id, email, business_name, ceo_name, business_no, verification_level, verification_status, suspended_at'
    )
    .eq('user_id', user.id)
    .single()) as { data: FullAccount | null }

  if (!account) return null

  const displayName = account.business_name ?? account.email

  // 이번 달 통계 — 60초 캐싱 (account_id 기준)
  const stats = await getDashboardStats(account.id)
  const monthOrderCount = stats.monthOrderCount
  const monthSaleKrw = stats.monthSaleKrw
  const skuCount = stats.skuCount
  const sub = stats.subscription
  const recentOrders = stats.recentOrders
  const statusCounts = stats.statusCounts

  const ordersValue = (monthOrderCount ?? 0).toLocaleString('ko-KR') + '건'
  const saleValue =
    monthSaleKrw > 0
      ? new Intl.NumberFormat('ko-KR').format(Math.round(monthSaleKrw)) + '원'
      : '—'
  const quotaValue =
    sub != null
      ? `${sub.monthly_order_used.toLocaleString('ko-KR')} / ${(sub.monthly_order_limit ?? '∞')}`
      : '—'
  const quotaSub = sub != null
    ? `${sub.plan_code.toUpperCase()} 플랜`
    : '구독 정보 없음'
  const skuSub =
    (skuCount ?? 0) > 0
      ? `등록된 SKU ${skuCount}개`
      : 'SKU 등록 시 자동 채움 활성'

  const isNewSeller = (monthOrderCount ?? 0) === 0 && (skuCount ?? 0) === 0

  // 환율 (실패 시 null)
  let rates: ExchangeRates | null = null
  try {
    rates = await getExchangeRates()
  } catch {
    rates = null
  }

  return (
    <div className="p-8 space-y-8 max-w-5xl">
      {/* 인사말 — B: 시각적 무게감 강화 */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            안녕하세요{account.ceo_name ? `, ${account.ceo_name}님` : ''} 👋
          </h1>
          <p className="text-sm text-slate-600 mt-1">{displayName} 대시보드입니다.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
        </span>
      </div>

      {/* 상태 배너 */}
      <StatusBanner account={account} />

      {/* 쿼터 경고 배너 */}
      <QuotaBanner />

      {/* 인증 진행 현황 */}
      <VerificationProgress level={account.verification_level} />

      {/* 빈 상태 onboarding — 신규 셀러 전용 */}
      {isNewSeller && <OnboardingGuide />}

      {/* 빠른 작업 — D: 보조 색 + 새로운 entry */}
      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">빠른 작업</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickActionCard
            title="새 주문 입력"
            description="마켓에서 받은 주문을 등록합니다"
            href="/orders/new"
            available={true}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            }
          />
          <QuickActionCard
            title="요금제 보기"
            description="플랜별 주문 한도와 가격을 확인합니다"
            href="/pricing"
            available={true}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
              </svg>
            }
          />
        </div>
      </section>

      {/* 통계 — E: 카드 shadow + accent border */}
      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">이번 달 현황</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="처리된 주문"
            accent="indigo"
            value={ordersValue}
            sub={`${new Date().getMonth() + 1}월 1일 이후`}
          />
          <StatCard
            label="이번 달 판매 합계 (KRW)"
            accent="emerald"
            value={saleValue}
            sub={monthSaleKrw > 0 ? '주문 라인 합산' : 'sale_price_krw 입력 시 집계'}
          />
          <StatCard
            label="주문 할당량"
            accent="sky"
            value={quotaValue}
            sub={quotaSub}
          />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          상품 SKU {skuSub}.
        </p>
      </section>

      {/* 환율 + 상태 파이프라인 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ExchangeRatesCard rates={rates} />
        <StatusPipelineCard counts={statusCounts} total={monthOrderCount ?? 0} />
      </section>

      {/* 최근 주문 */}
      <RecentOrdersCard orders={recentOrders} />
    </div>
  )
}

const STATUS_PIPELINE_META: { value: string; label: string; color: string }[] = [
  { value: 'pending', label: '마켓 접수', color: 'bg-slate-400' },
  { value: 'confirmed', label: '매입 발주', color: 'bg-blue-500' },
  { value: 'paid', label: '매입 완료', color: 'bg-sky-500' },
  { value: 'forwarder_submitted', label: '배대지 입고', color: 'bg-indigo-500' },
  { value: 'in_transit', label: '운송 중', color: 'bg-violet-500' },
  { value: 'arrived_korea', label: '한국 통관', color: 'bg-amber-500' },
  { value: 'delivered', label: '구매자 수령', color: 'bg-emerald-500' },
  { value: 'completed', label: '구매 확정', color: 'bg-emerald-600' },
]

const MP_LABEL: Record<string, string> = Object.fromEntries(
  MARKETPLACES.map((m) => [m.value, m.label]),
)

function ExchangeRatesCard({ rates }: { rates: ExchangeRates | null }) {
  const SHOW = ['USD', 'JPY', 'CNY', 'EUR']
  return (
    <div className="rounded-xl border border-slate-200 border-l-[3px] border-l-sky-500 bg-gradient-to-br from-sky-50/40 to-white shadow-sm p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider">오늘의 환율</p>
          <p className="text-[10px] text-slate-500 mt-0.5">한국수출입은행 매매기준율</p>
        </div>
        {rates?.isFallback && (
          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
            캐시값
          </span>
        )}
      </div>
      {rates == null ? (
        <p className="text-xs text-slate-500 py-2">환율 정보를 불러올 수 없습니다.</p>
      ) : (
        <ul className="grid grid-cols-4 gap-2">
          {SHOW.map((code) => {
            const r = rates.rates[code]
            if (!r) return (
              <li key={code} className="text-center">
                <p className="text-[10px] text-slate-500">{code}</p>
                <p className="text-sm font-semibold text-slate-400 tabular-nums">—</p>
              </li>
            )
            const unit = r.unit ?? 1
            return (
              <li key={code} className="text-center">
                <p className="text-[10px] text-slate-500">{unit > 1 ? `${unit} ${code}` : code}</p>
                <p className="text-sm font-bold text-slate-900 tabular-nums">
                  {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(r.rate)}
                </p>
                <p className="text-[9px] text-slate-400">원</p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function StatusPipelineCard({
  counts,
  total,
}: {
  counts: Record<string, number>
  total: number
}) {
  return (
    <div className="rounded-xl border border-slate-200 border-l-[3px] border-l-indigo-500 bg-gradient-to-br from-indigo-50/40 to-white shadow-sm p-5">
      <div className="mb-3">
        <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">진행 상태</p>
        <p className="text-[10px] text-slate-500 mt-0.5">이번 달 주문 {total}건</p>
      </div>
      {total === 0 ? (
        <p className="text-xs text-slate-500 py-2">이번 달 주문이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {STATUS_PIPELINE_META.map((s) => {
            const n = counts[s.value] ?? 0
            if (n === 0) return null
            const pct = Math.round((n / total) * 100)
            return (
              <li key={s.value} className="text-xs">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-slate-700">{s.label}</span>
                  <span className="tabular-nums text-slate-500">
                    {n}건 <span className="text-slate-400">({pct}%)</span>
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded">
                  <div className={`h-1.5 ${s.color} rounded`} style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function RecentOrdersCard({
  orders,
}: {
  orders: Array<{
    id: string
    order_number: string
    market_order_number: string | null
    marketplace: string | null
    status: string
    buyer_name: string | null
    created_at: string
    b2b_order_items: { product_name: string; sale_price_krw: number | string | null }[] | null
  }>
}) {
  if (orders.length === 0) return null
  function formatDateShort(s: string): string {
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return s
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
  function totalSale(items: { sale_price_krw: number | string | null }[] | null): string {
    if (!items || items.length === 0) return '—'
    let sum = 0
    let any = false
    for (const it of items) {
      const n = typeof it.sale_price_krw === 'number' ? it.sale_price_krw : Number(it.sale_price_krw)
      if (Number.isFinite(n) && n > 0) {
        sum += n
        any = true
      }
    }
    return any ? new Intl.NumberFormat('ko-KR').format(sum) + '원' : '—'
  }
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900">최근 주문</h2>
        <Link href="/orders" className="text-xs text-indigo-700 hover:text-indigo-800 font-medium">
          전체 보기 →
        </Link>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {orders.map((o) => {
            const product = o.b2b_order_items?.[0]?.product_name ?? '—'
            const extra = (o.b2b_order_items?.length ?? 0) > 1 ? ` 외 ${(o.b2b_order_items?.length ?? 1) - 1}건` : ''
            return (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70 transition-colors"
                >
                  <span className="text-[11px] text-slate-500 w-12 tabular-nums">
                    {formatDateShort(o.created_at)}
                  </span>
                  {o.marketplace ? (
                    <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 w-16 justify-center">
                      {MP_LABEL[o.marketplace] ?? o.marketplace}
                    </span>
                  ) : (
                    <span className="w-16" />
                  )}
                  <span className="font-mono text-xs text-slate-700 w-32 truncate">
                    {o.market_order_number ?? o.order_number}
                  </span>
                  <span className="text-xs text-slate-700 flex-1 truncate">
                    {product}
                    {extra && <span className="text-slate-400 ml-1">{extra}</span>}
                  </span>
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    {o.buyer_name ?? '—'}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                    {totalSale(o.b2b_order_items)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
