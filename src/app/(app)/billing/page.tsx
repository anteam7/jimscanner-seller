import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'

export const metadata: Metadata = {
  title: '결제 · 구독',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

type SubscriptionRow = {
  id: string
  status: string
  period_start: string | null
  period_end: string | null
  next_billing_at: string | null
  monthly_order_used: number
  monthly_order_quota_override: number | null
  cancelled_at: string | null
  cancellation_reason: string | null
  created_at: string
  b2b_subscription_plans: {
    plan_code: string
    name_ko: string
    description: string | null
    price_krw_monthly: number
    price_krw_yearly: number
    monthly_order_quota: number | null
    features: Record<string, boolean> | null
  } | null
}

function formatKRW(n: number | null): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('ko-KR').format(n) + '원'
}

function formatDate(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  active:    { label: '정상 구독 중', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  past_due:  { label: '결제 연체',     cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  cancelled: { label: '취소됨',        cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  paused:    { label: '일시 정지',     cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  trial:     { label: '체험',          cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
}

export default async function BillingPage() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id, business_name, email')
    .eq('user_id', user.id)
    .single()
  if (!account) return null

  const { data: sub } = (await db
    .from('b2b_subscriptions')
    .select('id, status, period_start, period_end, next_billing_at, monthly_order_used, monthly_order_quota_override, cancelled_at, cancellation_reason, created_at, b2b_subscription_plans(plan_code, name_ko, description, price_krw_monthly, price_krw_yearly, monthly_order_quota, features)')
    .eq('account_id', account.id)
    .maybeSingle()) as { data: SubscriptionRow | null }

  const plan = sub?.b2b_subscription_plans ?? null
  const quota = sub?.monthly_order_quota_override ?? plan?.monthly_order_quota ?? null
  const used = sub?.monthly_order_used ?? 0
  const usedPct = quota && quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0
  const statusMeta = sub != null ? (STATUS_LABEL[sub.status] ?? STATUS_LABEL.active) : null
  const isCancelled = sub?.status === 'cancelled' || sub?.cancelled_at != null

  return (
    <div className="p-8 max-w-5xl space-y-6">
      {/* 헤더 */}
      <div>
        <span className="inline-flex items-center gap-1.5 mb-3 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-[11px] font-semibold text-indigo-700">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          BILLING
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          결제 ·{' '}
          <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">
            구독 관리
          </span>
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          현재 구독 상태와 사용량을 확인하고 플랜을 변경할 수 있습니다.
        </p>
      </div>

      {/* 현재 플랜 카드 */}
      {plan == null ? (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center">
          <p className="text-sm text-slate-700 mb-3">아직 구독 정보가 없습니다.</p>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-md bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all"
          >
            플랜 선택하기
          </Link>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 border-l-[3px] border-l-indigo-500 bg-gradient-to-br from-indigo-50/30 to-white shadow-sm p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">
                현재 플랜
              </p>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{plan.name_ko}</h2>
              {plan.description && (
                <p className="text-xs text-slate-600 mt-1">{plan.description}</p>
              )}
            </div>
            {statusMeta && (
              <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${statusMeta.cls}`}>
                {statusMeta.label}
              </span>
            )}
          </div>

          {/* 사용량 진행바 */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <p className="text-xs font-semibold text-slate-700">이번 달 주문 사용량</p>
              <p className="text-xs text-slate-600 tabular-nums">
                <span className="font-bold text-slate-900">{used.toLocaleString('ko-KR')}</span>
                {' / '}
                <span>{quota == null ? '∞' : quota.toLocaleString('ko-KR') + '건'}</span>
                {quota != null && (
                  <span className={`ml-1.5 ${usedPct >= 90 ? 'text-rose-700 font-semibold' : usedPct >= 70 ? 'text-amber-700' : 'text-slate-500'}`}>
                    ({usedPct}%)
                  </span>
                )}
              </p>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${
                  usedPct >= 90 ? 'bg-rose-500' : usedPct >= 70 ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${quota == null ? 0 : usedPct}%` }}
              />
            </div>
            {usedPct >= 90 && quota != null && (
              <p className="text-[11px] text-rose-700 mt-1.5">
                ⚠ 할당량 임박 — 초과 시 신규 주문 등록이 제한됩니다. 상위 플랜으로 업그레이드를 검토하세요.
              </p>
            )}
          </div>

          {/* 가격 + 갱신일 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <Stat label="월 결제" value={plan.price_krw_monthly > 0 ? formatKRW(plan.price_krw_monthly) : '무료'} />
            <Stat label="연간 결제" value={plan.price_krw_yearly > 0 ? formatKRW(plan.price_krw_yearly) + ' /년' : '—'} />
            <Stat label="다음 갱신일" value={formatDate(sub?.next_billing_at ?? sub?.period_end ?? null)} />
          </div>
        </section>
      )}

      {/* 액션 카드 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/pricing"
          className="group rounded-xl border border-slate-200 border-l-[3px] border-l-indigo-500 bg-white shadow-sm p-5 hover:shadow-md hover:border-indigo-200 transition-all"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
              </svg>
            </div>
            <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">플랜 변경</p>
          <p className="text-xs text-slate-500 mt-0.5">전체 플랜 비교 + 업그레이드/다운그레이드</p>
        </Link>

        {!isCancelled && plan != null && plan.plan_code !== 'free' && (
          <Link
            href="/billing/cancel"
            className="group rounded-xl border border-slate-200 border-l-[3px] border-l-rose-400 bg-white shadow-sm p-5 hover:shadow-md hover:border-rose-200 transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-900 group-hover:text-rose-700 transition-colors">구독 취소</p>
            <p className="text-xs text-slate-500 mt-0.5">현재 결제 주기 끝까지 사용 + 자동 갱신 해제</p>
          </Link>
        )}
      </section>

      {/* 안내 */}
      <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
        <p className="text-xs font-semibold text-slate-700 mb-2">결제 안내</p>
        <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
          <li>현재 베타 운영 중으로 PG 결제 연동은 v0.5+ 예정. 유료 플랜은 별도 안내 후 청구됩니다.</li>
          <li>월 사용량은 자동 등록 트리거로 집계됩니다 (수동 보정 X).</li>
          <li>플랜 다운그레이드는 다음 결제 주기부터 적용됩니다.</li>
        </ul>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-slate-900 tabular-nums mt-1">{value}</p>
    </div>
  )
}
