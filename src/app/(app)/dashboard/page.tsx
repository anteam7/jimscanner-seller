import type { Metadata } from 'next'
import Link from 'next/link'
import { getExchangeRates, getYesterdayRates, type ExchangeRates } from '@/lib/b2b/exchange-rate'
import { MARKETPLACES } from '@/lib/b2b/order-options'
import { getDashboardStats } from '@/lib/b2b/dashboard-data'
import { getMarginLossAlerts, type MarginLossAlert } from '@/lib/b2b/margin-loss'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import type { SellerAccount } from '@/components/b2b/SellerShell'
import QuotaBanner from '@/components/b2b/QuotaBanner'
import OnboardingModal from '@/components/b2b/OnboardingModal'
import {
  buildEtaLookup,
  classifyEtaBucket,
  computeOrderEta,
  formatKstDate,
  type TransitDefault,
} from '@/lib/b2b/eta'

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

const HEALTH_HINT_ORDER: { flag: string; label: string; href?: string }[] = [
  { flag: 'no_orders_14d', label: '최근 14일간 주문이 없습니다 — 새 주문 등록', href: '/orders/new' },
  { flag: 'plan_canceled', label: '구독이 취소되었습니다 — 요금제 재선택', href: '/pricing' },
  { flag: 'margin_failed', label: '마진 미입력/음수 주문이 있습니다 — 주문 확인', href: '/orders' },
  { flag: 'verification_l1', label: '사업자 인증 미완료 — 인증 진행', href: '/signup/step-4' },
  { flag: 'no_extension', label: '크롬 확장 미설치 — 확장 토큰 발급', href: '/settings/extension' },
  { flag: 'orders_stuck', label: '7일 이상 정체된 주문 — 상태 확인', href: '/orders?status=pending' },
]

function HealthScoreCard({
  score,
  flags,
  snapshotDate,
}: {
  score: number
  flags: string[]
  snapshotDate: string
}) {
  const tone =
    score >= 80
      ? { ring: 'border-l-emerald-500', text: 'text-emerald-700', bg: 'from-emerald-50/60 to-white', label: '양호' }
      : score >= 60
        ? { ring: 'border-l-sky-500', text: 'text-sky-700', bg: 'from-sky-50/60 to-white', label: '정상' }
        : score >= 40
          ? { ring: 'border-l-amber-500', text: 'text-amber-700', bg: 'from-amber-50/60 to-white', label: '주의' }
          : { ring: 'border-l-rose-500', text: 'text-rose-700', bg: 'from-rose-50/60 to-white', label: '위험' }

  const topHint = HEALTH_HINT_ORDER.find((h) => flags.includes(h.flag))

  function formatSnapshotDate(s: string): string {
    const d = new Date(s + 'T00:00:00')
    if (Number.isNaN(d.getTime())) return s
    return `${d.getMonth() + 1}월 ${d.getDate()}일 기준`
  }

  return (
    <section
      className={`rounded-xl border border-slate-200 border-l-[3px] ${tone.ring} bg-gradient-to-br ${tone.bg} shadow-sm p-5 flex items-center gap-5 flex-wrap`}
    >
      <div className="flex items-baseline gap-2">
        <p className={`text-3xl font-bold tabular-nums ${tone.text}`}>{score}</p>
        <p className="text-xs text-slate-500">/ 100</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">셀러 health</p>
          <span className={`text-[10px] font-semibold ${tone.text} bg-white border border-slate-200 rounded px-1.5 py-0.5`}>
            {tone.label}
          </span>
          <span className="text-[10px] text-slate-400">{formatSnapshotDate(snapshotDate)}</span>
        </div>
        {topHint ? (
          topHint.href ? (
            <Link
              href={topHint.href}
              className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-slate-800 hover:text-indigo-700 transition-colors"
            >
              {topHint.label}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 12 12" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m3 2.5 4 3.5-4 3.5" />
              </svg>
            </Link>
          ) : (
            <p className="mt-1 text-sm font-medium text-slate-800">{topHint.label}</p>
          )
        ) : (
          <p className="mt-1 text-sm text-slate-600">현재 발견된 이슈가 없습니다.</p>
        )}
      </div>
    </section>
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

type AgentRunRow = {
  created_at: string
  mode: string | null
  agent_type: string | null
  task_picked: string | null
  task_status: string | null
  change_summary: string | null
}

type Progress = {
  hasToken: boolean
  hasMyAddress: boolean
  hasProduct: boolean
  hasOrder: boolean
  hasMatchedReceipt: boolean
}

function OnboardingGuide({ progress }: { progress?: Progress }) {
  const steps = [
    { key: 'hasToken', title: '확장 토큰 발급', desc: '크롬 확장과 짐스캐너 연결. 영수증 자동 수집·자동 채우기 필수.', href: '/settings/extension', done: progress?.hasToken ?? false },
    { key: 'hasMyAddress', title: '본인 배대지 주소 등록', desc: 'amazon 결제 시 배대지 자동 채움 (회원번호 필수).', href: '/settings/forwarder-addresses', done: progress?.hasMyAddress ?? false },
    { key: 'hasProduct', title: '첫 해외 상품 (SKU)', desc: '반복 매입 상품 미리 등록. 자동 채움 활성.', href: '/products/new', done: progress?.hasProduct ?? false, optional: true },
    { key: 'hasOrder', title: '첫 마켓 주문', desc: '마켓에서 받은 주문 등록. SKU 있으면 자동.', href: '/orders/new', done: progress?.hasOrder ?? false },
    { key: 'hasMatchedReceipt', title: '첫 영수증 매칭', desc: '해외 매입 영수증과 마켓 주문 연결.', href: '/imports', done: progress?.hasMatchedReceipt ?? false },
  ]
  const doneCount = steps.filter((s) => s.done).length
  const totalRequired = steps.filter((s) => !s.optional).length
  const doneRequired = steps.filter((s) => !s.optional && s.done).length

  return (
    <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-sky-50 shadow-sm overflow-hidden">
      <div className="px-6 pt-6 pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-indigo-200 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            START CHECKLIST
          </span>
          <span className="text-[11px] font-bold text-indigo-700 tabular-nums">
            진행 {doneCount}/{steps.length} ({doneRequired}/{totalRequired} 필수)
          </span>
        </div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          첫 사용 5단계
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          한 번 셋업해 두면 다음 주문부터 모든 흐름이 자동으로 됩니다.
        </p>
        {/* 진행 바 */}
        <div className="mt-3 h-1.5 rounded-full bg-indigo-100 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${Math.round((doneCount / steps.length) * 100)}%` }} />
        </div>
      </div>
      <div className="space-y-2 px-6 py-4">
        {steps.map((s, i) => (
          <Link key={s.key} href={s.href}
            className={`flex items-start gap-3 p-3 rounded-lg transition-colors border ${
              s.done
                ? 'bg-emerald-50/50 border-emerald-200'
                : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
            }`}>
            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
              s.done
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}>
              {s.done ? '✓' : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-sm font-semibold ${s.done ? 'text-emerald-900 line-through' : 'text-slate-900'}`}>
                  {s.title}
                </p>
                {s.optional && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">선택</span>}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{s.desc}</p>
            </div>
            {!s.done && (
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            )}
          </Link>
        ))}
      </div>
      <div className="px-6 pb-5">
        <p className="text-[11px] text-slate-500 text-center">
          순서대로 안 해도 됩니다. 필수 {totalRequired}개 ({steps.filter((s) => !s.optional).map((s) => s.title).join('·')}) 만 끝내면 핵심 흐름 작동.
        </p>
      </div>
    </section>
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

  // "오늘 행동 큐" — 셀러가 즉시 행동해야 하는 항목들
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  // server component: per-request side effects are intended (not React render purity)
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now()
  const oneDayAgoIso = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgoIso = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [unmatchedReceiptsRes, refundRequestsRes, oldPendingRes, oldUnmatchedRes,
         tokenCountRes, myAddressCountRes, productCountRes, orderCountRes, matchedReceiptCountRes,
         healthSnapshotRes] = await Promise.all([
    db.from('b2b_supplier_purchases').select('id', { count: 'exact', head: true }).eq('account_id', account.id).is('matched_order_id', null),
    db.from('b2b_orders').select('id', { count: 'exact', head: true }).eq('account_id', account.id).is('deleted_at', null).eq('status', 'refund_requested'),
    db.from('b2b_orders').select('id', { count: 'exact', head: true }).eq('account_id', account.id).is('deleted_at', null).eq('status', 'pending').lt('created_at', oneDayAgoIso),
    db.from('b2b_supplier_purchases').select('id', { count: 'exact', head: true }).eq('account_id', account.id).is('matched_order_id', null).lt('created_at', sevenDaysAgoIso),
    // Progress 5단계
    db.from('b2b_seller_tokens').select('id', { count: 'exact', head: true }).eq('account_id', account.id).is('revoked_at', null),
    db.from('b2b_forwarder_addresses').select('id', { count: 'exact', head: true }).eq('account_id', account.id),
    db.from('b2b_products').select('id', { count: 'exact', head: true }).eq('account_id', account.id).eq('is_active', true),
    db.from('b2b_orders').select('id', { count: 'exact', head: true }).eq('account_id', account.id).is('deleted_at', null),
    db.from('b2b_supplier_purchases').select('id', { count: 'exact', head: true }).eq('account_id', account.id).not('matched_order_id', 'is', null),
    // PH0-3: 본인 health score 최신 스냅샷 (오늘 또는 직전)
    db.from('b2b_seller_health_snapshot').select('health_score, issue_flags, snapshot_date').eq('account_id', account.id).order('snapshot_date', { ascending: false }).limit(1).maybeSingle(),
  ])
  const actionQueue = {
    unmatchedReceipts: unmatchedReceiptsRes.count ?? 0,
    refundRequests: refundRequestsRes.count ?? 0,
    oldPending: oldPendingRes.count ?? 0,
    oldUnmatched: oldUnmatchedRes.count ?? 0,
  }
  const totalActions = actionQueue.unmatchedReceipts + actionQueue.refundRequests + actionQueue.oldPending + actionQueue.oldUnmatched
  const progress = {
    hasToken: (tokenCountRes.count ?? 0) > 0,
    hasMyAddress: (myAddressCountRes.count ?? 0) > 0,
    hasProduct: (productCountRes.count ?? 0) > 0,
    hasOrder: (orderCountRes.count ?? 0) > 0,
    hasMatchedReceipt: (matchedReceiptCountRes.count ?? 0) > 0,
  }
  // checklist 미완료 단계 있으면 항상 표시
  const showChecklist = !progress.hasToken || !progress.hasMyAddress || !progress.hasOrder || !progress.hasMatchedReceipt

  // PH0-3: health score 미니카드 데이터 (snapshot 없으면 null → 숨김)
  const healthSnapshot: { health_score: number | null; issue_flags: string[]; snapshot_date: string } | null =
    healthSnapshotRes?.data
      ? {
          health_score: healthSnapshotRes.data.health_score ?? null,
          issue_flags: Array.isArray(healthSnapshotRes.data.issue_flags)
            ? (healthSnapshotRes.data.issue_flags as string[])
            : [],
          snapshot_date: healthSnapshotRes.data.snapshot_date,
        }
      : null

  // 환율 (실패 시 null) + 전일 비교
  let rates: ExchangeRates | null = null
  let yesterdayRates: ExchangeRates | null = null
  try {
    [rates, yesterdayRates] = await Promise.all([
      getExchangeRates(),
      getYesterdayRates(),
    ])
  } catch {
    rates = null
  }

  // #idea-4: 카드별 이달 매입 합계 (b2b_payment_cards 등록된 카드만)
  type CardSpendRow = {
    card_id: string
    alias: string
    last4: string | null
    color: string | null
    line_count: number
    total_foreign: Record<string, number>  // {USD: 123.45, JPY: 5000}
    total_krw: number
  }
  let cardSpends: CardSpendRow[] = []
  try {
    const adminCs = createAdminClient()
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const { data: cardsList } = await adminCs
      .from('b2b_payment_cards')
      .select('id, alias, last4, color, is_active')
      .eq('account_id', account.id)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
    const activeCards = (cardsList ?? []).filter((c) => c.is_active)
    if (activeCards.length > 0) {
      // 이달 라인 (소유 주문) join. supabase 의 inner-join 으로 account 격리
      type LineRow = {
        payment_card_id: string | null
        unit_price_foreign: number | string | null
        total_price_foreign: number | string | null
        total_price_krw: number | string | null
        quantity: number | null
        currency: string | null
        b2b_orders: { account_id: string; order_date: string } | null
      }
      const { data: linesRaw } = await adminCs
        .from('b2b_order_items')
        .select(
          'payment_card_id, unit_price_foreign, total_price_foreign, total_price_krw, quantity, currency, b2b_orders!inner(account_id, order_date)',
        )
        .not('payment_card_id', 'is', null)
        .gte('b2b_orders.order_date', monthStart.toISOString())
        .eq('b2b_orders.account_id', account.id)
      const lines = (linesRaw ?? []) as unknown as LineRow[]
      const byCard = new Map<string, { lineCount: number; totalForeign: Record<string, number>; totalKrw: number }>()
      for (const ln of lines) {
        if (!ln.payment_card_id) continue
        const bucket =
          byCard.get(ln.payment_card_id) ?? { lineCount: 0, totalForeign: {}, totalKrw: 0 }
        bucket.lineCount += 1
        const qty = Number(ln.quantity ?? 1)
        const unit = Number(ln.unit_price_foreign ?? 0)
        const totalFx =
          ln.total_price_foreign != null ? Number(ln.total_price_foreign) : unit * qty
        if (Number.isFinite(totalFx) && totalFx > 0 && ln.currency) {
          const cur = ln.currency.toUpperCase()
          bucket.totalForeign[cur] = (bucket.totalForeign[cur] ?? 0) + totalFx
        }
        if (ln.total_price_krw != null) {
          const krw = Number(ln.total_price_krw)
          if (Number.isFinite(krw)) bucket.totalKrw += krw
        }
        byCard.set(ln.payment_card_id, bucket)
      }
      cardSpends = activeCards.map((c) => {
        const b = byCard.get(c.id) ?? { lineCount: 0, totalForeign: {}, totalKrw: 0 }
        return {
          card_id: c.id,
          alias: c.alias,
          last4: c.last4 ?? null,
          color: c.color ?? null,
          line_count: b.lineCount,
          total_foreign: b.totalForeign,
          total_krw: b.totalKrw,
        }
      })
    }
  } catch {
    cardSpends = []
  }

  // #idea-5: ETA 미니카드 — 지연 + 이번주 도착 예정 (active 주문만)
  let etaSummary: { overdue: number; thisWeek: number; nextThree: Array<{ id: string; ref: string; days: number; eta: string; buyer: string | null }> } = {
    overdue: 0, thisWeek: 0, nextThree: [],
  }
  try {
    const ACTIVE_STATUS = ['draft', 'pending', 'paid', 'purchasing', 'shipping', 'refund_requested']
    const [{ data: etaOrdersRaw }, { data: etaDefaultsRaw }] = await Promise.all([
      supabase
        .from('b2b_orders')
        .select('id, order_number, market_order_number, buyer_name, forwarder_country, forwarder_submitted_at, order_date, created_at, status')
        .eq('account_id', account.id)
        .is('deleted_at', null)
        .in('status', ACTIVE_STATUS)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('b2b_forwarder_transit_defaults')
        .select('origin_country, method, avg_transit_days, min_transit_days, max_transit_days')
        .eq('is_active', true),
    ])
    const lookup = buildEtaLookup((etaDefaultsRaw ?? []) as TransitDefault[])
    const nowDate = new Date()
    let overdue = 0
    let thisWeek = 0
    const upcoming: Array<{ id: string; ref: string; days: number; eta: Date; buyer: string | null }> = []
    for (const o of etaOrdersRaw ?? []) {
      const { eta } = computeOrderEta(o, lookup)
      const bucket = classifyEtaBucket(eta, nowDate)
      if (bucket === 'overdue') overdue++
      else if (bucket === 'this_week') thisWeek++
      if (bucket === 'this_week' || bucket === 'overdue') {
        const remaining = Math.round((eta.getTime() - nowDate.getTime()) / (24 * 60 * 60 * 1000))
        upcoming.push({
          id: o.id,
          ref: o.market_order_number ?? o.order_number,
          days: remaining,
          eta,
          buyer: o.buyer_name,
        })
      }
    }
    upcoming.sort((a, b) => a.eta.getTime() - b.eta.getTime())
    etaSummary = {
      overdue,
      thisWeek,
      nextThree: upcoming.slice(0, 3).map((u) => ({
        id: u.id,
        ref: u.ref,
        days: u.days,
        eta: formatKstDate(u.eta),
        buyer: u.buyer,
      })),
    }
  } catch {
    etaSummary = { overdue: 0, thisWeek: 0, nextThree: [] }
  }

  // #12: 최근 agent 활동 3건 (admin client — b2b_auto_runs RLS bypass)
  let recentAgentRuns: AgentRunRow[] = []
  try {
    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = admin as any
    const { data: agentRunsData } = await adminAny
      .from('b2b_auto_runs')
      .select('created_at, mode, agent_type, task_picked, task_status, change_summary')
      .order('created_at', { ascending: false })
      .limit(3)
    if (Array.isArray(agentRunsData)) {
      recentAgentRuns = agentRunsData as AgentRunRow[]
    }
  } catch {
    recentAgentRuns = []
  }

  // H3 — 마진 손실 SKU (환율이 있어야 계산 가능)
  let marginLossAlerts: MarginLossAlert[] = []
  if (rates) {
    const ratesMap: Record<string, { rate: number; unit: number }> = {}
    for (const [k, v] of Object.entries(rates.rates)) {
      ratesMap[k] = { rate: v.rate, unit: v.unit }
    }
    try {
      marginLossAlerts = await getMarginLossAlerts(account.id, ratesMap)
    } catch {
      marginLossAlerts = []
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-5xl">
      {/* B3: 첫 로그인 환영 모달 (신규 셀러 + localStorage dismiss 추적) */}
      <OnboardingModal
        ceoName={account.ceo_name}
        displayName={displayName}
        isNewSeller={isNewSeller}
      />

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

      {/* PH0-3: 본인 health score 미니카드 */}
      {healthSnapshot && healthSnapshot.health_score != null && (
        <HealthScoreCard
          score={healthSnapshot.health_score}
          flags={healthSnapshot.issue_flags}
          snapshotDate={healthSnapshot.snapshot_date}
        />
      )}

      {/* 쿼터 경고 배너 */}
      <QuotaBanner />

      {/* 인증 진행 현황 */}
      <VerificationProgress level={account.verification_level} />

      {/* Progressive checklist — 미완료 단계 있으면 항상 표시 */}
      {showChecklist && <OnboardingGuide progress={progress} />}

      {/* H3 — 마진 손실 알림 */}
      {marginLossAlerts.length > 0 && <MarginLossBanner alerts={marginLossAlerts} />}

      {/* 오늘 행동 큐 — 즉시 행동 필요 항목 */}
      {totalActions > 0 && (
        <section className="rounded-xl bg-gradient-to-r from-amber-50 to-white border border-amber-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-1.5">
            <span>⚡</span> 오늘 행동 큐 ({totalActions}건)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {actionQueue.unmatchedReceipts > 0 && (
              <Link href="/imports" className="block rounded-lg bg-white border border-amber-200 px-4 py-3 hover:shadow-md transition-shadow">
                <p className="text-[11px] uppercase tracking-wider text-amber-700 font-semibold">매칭 대기 영수증</p>
                <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{actionQueue.unmatchedReceipts}건</p>
                <p className="mt-0.5 text-[11px] text-slate-500">/imports 에서 매칭 →</p>
              </Link>
            )}
            {actionQueue.refundRequests > 0 && (
              <Link href="/orders?status=refund_requested" className="block rounded-lg bg-white border border-rose-200 px-4 py-3 hover:shadow-md transition-shadow">
                <p className="text-[11px] uppercase tracking-wider text-rose-700 font-semibold">환불 신청 주문</p>
                <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{actionQueue.refundRequests}건</p>
                <p className="mt-0.5 text-[11px] text-slate-500">처리 필요 →</p>
              </Link>
            )}
            {actionQueue.oldPending > 0 && (
              <Link href="/orders?status=pending" className="block rounded-lg bg-white border border-slate-200 px-4 py-3 hover:shadow-md transition-shadow">
                <p className="text-[11px] uppercase tracking-wider text-slate-700 font-semibold">매입 미진행 (1일+)</p>
                <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{actionQueue.oldPending}건</p>
                <p className="mt-0.5 text-[11px] text-slate-500">매입 발주 권장 →</p>
              </Link>
            )}
            {actionQueue.oldUnmatched > 0 && (
              <Link href="/imports" className="block rounded-lg bg-white border border-rose-200 px-4 py-3 hover:shadow-md transition-shadow">
                <p className="text-[11px] uppercase tracking-wider text-rose-700 font-semibold">⏰ 무매칭 7일+</p>
                <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{actionQueue.oldUnmatched}건</p>
                <p className="mt-0.5 text-[11px] text-slate-500">방치된 영수증 처리 →</p>
              </Link>
            )}
          </div>
        </section>
      )}

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
        <ExchangeRatesCard rates={rates} yesterday={yesterdayRates} />
        <StatusPipelineCard counts={statusCounts} total={monthOrderCount ?? 0} />
      </section>

      {/* #idea-5: 도착 예정 (ETA) 미니카드 — 지연/이번주 있을 때만 */}
      {(etaSummary.overdue > 0 || etaSummary.thisWeek > 0) && (
        <EtaMiniCard
          overdue={etaSummary.overdue}
          thisWeek={etaSummary.thisWeek}
          upcoming={etaSummary.nextThree}
        />
      )}

      {/* 최근 주문 */}
      <RecentOrdersCard orders={recentOrders} />

      {/* #idea-4: 카드별 매입 합계 — 등록 카드가 있을 때만 */}
      {cardSpends.length > 0 && <CardSpendCard spends={cardSpends} />}

      {/* #12: 최근 agent 활동 — 시스템이 일하고 있다는 transparency */}
      {recentAgentRuns.length > 0 && <RecentAgentActivityCard runs={recentAgentRuns} />}
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

function formatFetchedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const now = Date.now()
  const diffMin = Math.floor((now - d.getTime()) / 60000)
  if (diffMin < 1) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}시간 전`
  return d.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function ExchangeRatesCard({
  rates,
  yesterday,
}: {
  rates: ExchangeRates | null
  yesterday: ExchangeRates | null
}) {
  const SHOW = ['USD', 'JPY', 'CNY', 'EUR']
  // 큰 변동 (절댓값 1% 이상) 알림용
  const bigMove =
    rates && yesterday
      ? SHOW.map((code) => {
          const t = rates.rates[code]
          const y = yesterday.rates[code]
          if (!t || !y) return null
          const tUnit = t.unit || 1
          const yUnit = y.unit || 1
          const tPerOne = t.rate / tUnit
          const yPerOne = y.rate / yUnit
          if (yPerOne === 0) return null
          const pct = ((tPerOne - yPerOne) / yPerOne) * 100
          if (Math.abs(pct) < 1) return null
          return { code, pct }
        }).filter((x): x is { code: string; pct: number } => x != null)
      : []
  return (
    <div className="rounded-xl border border-slate-200 border-l-[3px] border-l-sky-500 bg-gradient-to-br from-sky-50/40 to-white shadow-sm p-5">
      <div className="flex items-baseline justify-between mb-3 gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider">오늘의 환율</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            한국수출입은행 매매기준율 {yesterday ? '· 전일 대비' : ''}
          </p>
          {rates?.fetchedAt && (
            <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
              마지막 성공 {formatFetchedAt(rates.fetchedAt)}
            </p>
          )}
        </div>
        {rates?.isFallback && (
          <span
            className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 font-semibold shrink-0"
            title="실시간 환율 호출에 실패해 직전 캐시값을 표시합니다."
          >
            ⚠ 캐시값 사용 중
          </span>
        )}
      </div>
      {rates == null ? (
        <p className="text-xs text-slate-500 py-2">환율 정보를 불러올 수 없습니다.</p>
      ) : (
        <>
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
              const y = yesterday?.rates[code]
              let pct: number | null = null
              if (y) {
                const tPerOne = r.rate / (r.unit || 1)
                const yPerOne = y.rate / (y.unit || 1)
                if (yPerOne > 0) pct = ((tPerOne - yPerOne) / yPerOne) * 100
              }
              const big = pct != null && Math.abs(pct) >= 1
              return (
                <li key={code} className="text-center">
                  <p className="text-[10px] text-slate-500">{unit > 1 ? `${unit} ${code}` : code}</p>
                  <p className="text-sm font-bold text-slate-900 tabular-nums">
                    {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(r.rate)}
                  </p>
                  {pct != null ? (
                    <p
                      className={`text-[10px] tabular-nums ${
                        big
                          ? pct > 0
                            ? 'text-rose-600 font-semibold'
                            : 'text-emerald-600 font-semibold'
                          : pct > 0
                            ? 'text-rose-500'
                            : pct < 0
                              ? 'text-emerald-500'
                              : 'text-slate-400'
                      }`}
                    >
                      {pct > 0 ? '▲' : pct < 0 ? '▼' : '–'} {Math.abs(pct).toFixed(2)}%
                    </p>
                  ) : (
                    <p className="text-[9px] text-slate-400">원</p>
                  )}
                </li>
              )
            })}
          </ul>
          {bigMove.length > 0 && (
            <div className="mt-3 pt-3 border-t border-sky-100">
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                ⚠ 큰 변동 — {bigMove.map((m) => `${m.code} ${m.pct > 0 ? '+' : ''}${m.pct.toFixed(1)}%`).join(' · ')}.
                매입 단가 확인이 필요합니다.
              </p>
            </div>
          )}
        </>
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

function formatRunAgo(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}시간 전`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}일 전`
  return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

const AGENT_MODE_META: Record<string, { label: string; tone: string }> = {
  implementation: { label: '구현', tone: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  review: { label: '점검', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  discovery: { label: '발견', tone: 'bg-sky-50 text-sky-700 border-sky-200' },
}

const CARD_COLOR_CLS: Record<string, string> = {
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  sky: 'bg-sky-500',
  slate: 'bg-slate-700',
}

type CardSpend = {
  card_id: string
  alias: string
  last4: string | null
  color: string | null
  line_count: number
  total_foreign: Record<string, number>
  total_krw: number
}

function EtaMiniCard({
  overdue,
  thisWeek,
  upcoming,
}: {
  overdue: number
  thisWeek: number
  upcoming: Array<{ id: string; ref: string; days: number; eta: string; buyer: string | null }>
}) {
  return (
    <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-sky-500 bg-white shadow-sm p-5">
      <div className="flex items-baseline justify-between mb-3 gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">도착 예정 (ETA)</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            배대지·국가별 평균 운송일수 기준
          </p>
        </div>
        <Link
          href="/eta"
          prefetch={false}
          className="text-[11px] font-medium text-indigo-700 hover:text-indigo-900 whitespace-nowrap"
        >
          전체 보기 →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-2">
          <p className="text-[10px] font-medium text-rose-700 uppercase tracking-wider">지연</p>
          <p className="mt-0.5 text-xl font-bold text-rose-700 tabular-nums">{overdue}건</p>
        </div>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2">
          <p className="text-[10px] font-medium text-indigo-700 uppercase tracking-wider">이번 주</p>
          <p className="mt-0.5 text-xl font-bold text-indigo-700 tabular-nums">{thisWeek}건</p>
        </div>
      </div>
      {upcoming.length > 0 && (
        <ul className="divide-y divide-slate-100 border-t border-slate-100 -mb-1">
          {upcoming.map((u) => (
            <li key={u.id} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/orders/${u.id}`}
                  prefetch={false}
                  className="text-sm font-medium text-slate-900 hover:text-indigo-700 transition-colors truncate block"
                >
                  {u.ref}
                </Link>
                <p className="text-[11px] text-slate-500 truncate">
                  {u.buyer ?? '—'}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-medium text-slate-700 tabular-nums">{u.eta}</p>
                <p className="text-[10px] tabular-nums">
                  {u.days < 0 ? (
                    <span className="text-rose-700 font-semibold">{Math.abs(u.days)}일 지연</span>
                  ) : u.days === 0 ? (
                    <span className="text-indigo-700 font-semibold">오늘</span>
                  ) : (
                    <span className="text-slate-500">{u.days}일 후</span>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CardSpendCard({ spends }: { spends: CardSpend[] }) {
  const totalLines = spends.reduce((s, x) => s + x.line_count, 0)
  const totalKrw = spends.reduce((s, x) => s + x.total_krw, 0)
  return (
    <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-emerald-500 bg-white shadow-sm p-5">
      <div className="flex items-baseline justify-between mb-3 gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">이달 카드별 매입</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            라인에 매핑된 결제 카드 기준 — {new Date().getMonth() + 1}월 합계
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">총 매입 라인</p>
          <p className="text-sm font-bold text-slate-900 tabular-nums">{totalLines}건</p>
        </div>
      </div>
      <ul className="divide-y divide-slate-100">
        {spends.map((c) => {
          const colorCls = c.color && CARD_COLOR_CLS[c.color] ? CARD_COLOR_CLS[c.color] : 'bg-slate-400'
          const fxEntries = Object.entries(c.total_foreign).filter(([, v]) => v > 0)
          const hasSpend = c.line_count > 0
          return (
            <li key={c.card_id} className="py-2.5 flex items-start gap-3">
              <span className={`w-1.5 h-10 rounded ${colorCls} flex-shrink-0 mt-0.5`} aria-hidden />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-900 truncate">{c.alias}</p>
                  {c.last4 && (
                    <span className="text-[11px] text-slate-500 tabular-nums">···· {c.last4}</span>
                  )}
                </div>
                {hasSpend ? (
                  <div className="mt-0.5 flex items-center gap-3 flex-wrap text-[11px] text-slate-600">
                    <span className="text-slate-500">{c.line_count}건</span>
                    {fxEntries.map(([cur, v]) => (
                      <span key={cur} className="tabular-nums">
                        {cur} {v.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}
                      </span>
                    ))}
                    {c.total_krw > 0 && (
                      <span className="tabular-nums text-emerald-700 font-semibold">
                        ₩ {c.total_krw.toLocaleString('ko-KR')}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="mt-0.5 text-[11px] text-slate-400">이달 매입 없음</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {totalKrw > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">전체 합계 (KRW 입력분)</span>
          <span className="font-bold text-emerald-700 tabular-nums">
            ₩ {totalKrw.toLocaleString('ko-KR')}
          </span>
        </div>
      )}
    </section>
  )
}

function RecentAgentActivityCard({ runs }: { runs: AgentRunRow[] }) {
  return (
    <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-slate-400 bg-gradient-to-br from-slate-50/60 to-white shadow-sm p-5">
      <div className="flex items-baseline justify-between mb-3 gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">최근 시스템 활동</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            짐스캐너가 자동으로 점검·개선하고 있는 작업 내역입니다
          </p>
        </div>
      </div>
      <ul className="space-y-2.5">
        {runs.map((r, idx) => {
          const meta = r.mode ? AGENT_MODE_META[r.mode] : null
          const title = r.task_picked ?? '(이름 없음)'
          const summary = r.change_summary ?? ''
          const truncated = summary.length > 140 ? summary.slice(0, 140).trimEnd() + '…' : summary
          const failed = r.task_status === 'failed'
          return (
            <li key={idx} className="flex items-start gap-3">
              <span className="text-[10px] text-slate-400 tabular-nums shrink-0 w-12 mt-0.5">
                {formatRunAgo(r.created_at)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {meta && (
                    <span className={`text-[10px] font-semibold border rounded px-1.5 py-0.5 ${meta.tone}`}>
                      {meta.label}
                    </span>
                  )}
                  {failed && (
                    <span className="text-[10px] font-semibold border rounded px-1.5 py-0.5 bg-rose-50 text-rose-700 border-rose-200">
                      실패
                    </span>
                  )}
                  <p className="text-xs font-medium text-slate-800 truncate">{title}</p>
                </div>
                {truncated && (
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{truncated}</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function MarginLossBanner({ alerts }: { alerts: MarginLossAlert[] }) {
  const top = alerts.slice(0, 5)
  const totalLoss = alerts.reduce((acc, a) => acc + a.loss_per_unit_krw, 0)
  return (
    <section
      role="region"
      aria-labelledby="margin-loss-title"
      className="rounded-xl border border-rose-200 border-l-[3px] border-l-rose-500 bg-gradient-to-br from-rose-50 to-white shadow-sm overflow-hidden"
    >
      <div className="px-5 py-3.5 border-b border-rose-100 flex items-start gap-3">
        <div aria-hidden="true" className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center shrink-0 shadow-sm shadow-rose-500/30">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p id="margin-loss-title" className="text-sm font-bold text-rose-900">
            마진 손실 위험 SKU {alerts.length}건
          </p>
          <p className="mt-0.5 text-xs text-rose-800">
            현 환율 기준 매입가 + 배대지비가 최근 30일 평균 판매가보다 큽니다 — 단가 조정 또는 매입처 변경을 검토하세요.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-rose-700 uppercase tracking-wider font-semibold">건당 손실</p>
          <p className="text-sm font-bold text-rose-900 tabular-nums">
            평균 ₩{Math.round(totalLoss / alerts.length).toLocaleString('ko-KR')}
          </p>
        </div>
      </div>
      <ul className="divide-y divide-rose-100">
        {top.map((a) => (
          <li key={a.product_id}>
            <Link
              href={`/products/${a.product_id}`}
              className="block px-5 py-2.5 hover:bg-rose-50/60 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-rose-700 shrink-0">{a.seller_sku}</span>
                    <span className="text-sm text-slate-900 truncate">{a.product_name}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    매입가 환산 <span className="font-semibold tabular-nums">₩{a.default_unit_price_krw.toLocaleString('ko-KR')}</span> + 배송 ₩6,000
                    {' · '}
                    최근 평균 판매 <span className="font-semibold tabular-nums">₩{a.recent_avg_sale_krw.toLocaleString('ko-KR')}</span>
                    {' '}({a.recent_order_count}건)
                  </p>
                </div>
                <span className="text-sm font-bold text-rose-700 tabular-nums shrink-0">
                  −₩{a.loss_per_unit_krw.toLocaleString('ko-KR')}/개
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {alerts.length > top.length && (
        <p className="px-5 py-2 text-[11px] text-rose-700 bg-rose-50/40 border-t border-rose-100 text-center">
          외 {alerts.length - top.length}건 더 — <Link href="/analytics" className="font-semibold underline underline-offset-2">매출·마진 분석 →</Link>
        </p>
      )}
    </section>
  )
}
