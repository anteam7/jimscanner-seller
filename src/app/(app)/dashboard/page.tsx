import type { Metadata } from 'next'
import Link from 'next/link'
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

  // 이번 달 통계 — 현재 월 1일 00:00 KST 부터
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: monthOrderCount },
    { data: subRows },
    { data: monthOrderItems },
    { count: skuCount },
  ] = await Promise.all([
    db
      .from('b2b_orders')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', account.id)
      .is('deleted_at', null)
      .gte('created_at', monthStart),
    db
      .from('b2b_subscriptions')
      .select('plan_code, monthly_order_used, monthly_order_limit')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })
      .limit(1),
    db
      .from('b2b_order_items')
      .select('sale_price_krw, b2b_orders!inner(account_id, deleted_at, created_at)')
      .eq('b2b_orders.account_id', account.id)
      .is('b2b_orders.deleted_at', null)
      .gte('b2b_orders.created_at', monthStart),
    db
      .from('b2b_products')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', account.id)
      .eq('is_active', true),
  ])

  type Subscription = { plan_code: string; monthly_order_used: number; monthly_order_limit: number | null }
  const sub: Subscription | null = (subRows as Subscription[] | null)?.[0] ?? null

  type ItemRow = { sale_price_krw: number | string | null }
  const monthSaleKrw = ((monthOrderItems as ItemRow[] | null) ?? []).reduce((acc, it) => {
    const v = it.sale_price_krw
    if (v == null || v === '') return acc
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? acc + n : acc
  }, 0)

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

      {/* 빠른 작업 — D: 보조 색 + 새로운 entry */}
      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">빠른 작업</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickActionCard
            title="새 주문 입력"
            description="수동으로 의뢰자 주문을 입력합니다"
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
    </div>
  )
}
