import Link from 'next/link'

export type PlanData = {
  id: string
  plan_code: string
  name_ko: string
  description: string | null
  price_krw_monthly: number
  price_krw_yearly: number
  monthly_order_quota: number | null
  required_verification_level: number
  features: Record<string, boolean>
  display_order: number
}

const FEATURE_LABELS: Record<string, string> = {
  order_excel_upload: '엑셀 업로드 주문 등록',
  forwarder_recommend: 'AI 배대지 추천',
  saved_mappings: '배대지 양식 매핑 저장',
  tracking_auto: '운송장 자동 트래킹',
  intelligence: '인텔리전스 리포트',
  team: '팀원 초대',
  api: 'API 연동',
  encrypted_pii: 'PII 암호화 저장',
  rpa: 'RPA 자동화',
}

type Props = {
  plan: PlanData
  isCurrentPlan: boolean
  isLocked: boolean
  billingPeriod: 'monthly' | 'yearly'
}

export default function PricingCard({ plan, isCurrentPlan, isLocked, billingPeriod }: Props) {
  const isEnterprise = plan.plan_code === 'enterprise'
  const isFree = plan.plan_code === 'free'
  const isPro = plan.plan_code === 'pro'

  const monthlyEquivalent =
    billingPeriod === 'yearly' && plan.price_krw_yearly > 0
      ? Math.round(plan.price_krw_yearly / 12)
      : plan.price_krw_monthly

  const yearlyDiscount =
    plan.price_krw_monthly > 0 && plan.price_krw_yearly > 0
      ? Math.round((1 - monthlyEquivalent / plan.price_krw_monthly) * 100)
      : 0

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-200
        ${isCurrentPlan
          ? 'border-indigo-600 bg-indigo-950/30 shadow-[0_0_0_1px_theme(colors.indigo.600)]'
          : isPro && !isCurrentPlan
          ? 'border-indigo-800/60 bg-slate-900/60'
          : 'border-slate-800 bg-slate-900/40'
        }
        ${isLocked && !isCurrentPlan ? 'opacity-60' : ''}
      `}
    >
      {/* 현재 플랜 배지 */}
      {isCurrentPlan && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
            </svg>
            현재 플랜
          </span>
        </div>
      )}

      {/* 인증 필요 잠금 배지 */}
      {isLocked && !isCurrentPlan && !isEnterprise && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25V4.5a2.25 2.25 0 1 1 4.5 0v.75M3 5.25h6a.75.75 0 0 1 .75.75v3.75A.75.75 0 0 1 9 10.5H3a.75.75 0 0 1-.75-.75V6a.75.75 0 0 1 .75-.75Z" />
            </svg>
            인증 필요
          </span>
        </div>
      )}

      {/* 플랜 이름 + 설명 */}
      <div className="mb-5 mt-1">
        <h3 className="text-lg font-bold text-white">{plan.name_ko}</h3>
        {plan.description && (
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{plan.description}</p>
        )}
      </div>

      {/* 가격 */}
      <div className="mb-5">
        {isEnterprise ? (
          <p className="text-2xl font-bold text-white">협의</p>
        ) : isFree ? (
          <div>
            <p className="text-2xl font-bold text-white">무료</p>
            <p className="text-xs text-slate-500 mt-0.5">베타 기간 한정</p>
          </div>
        ) : (
          <div>
            <div className="flex items-end gap-1.5">
              <span className="text-2xl font-bold text-white tabular-nums transition-all duration-300">
                {monthlyEquivalent.toLocaleString()}
              </span>
              <span className="text-sm text-slate-400 mb-0.5">원/월</span>
            </div>
            {billingPeriod === 'yearly' && yearlyDiscount > 0 ? (
              <p className="text-xs text-green-400 mt-0.5">
                연 {plan.price_krw_yearly.toLocaleString()}원 결제 (약 {yearlyDiscount}% 할인)
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-0.5">부가세 별도</p>
            )}
          </div>
        )}
      </div>

      {/* 할당량 */}
      <div className="mb-5 py-2.5 px-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
        <p className="text-xs text-slate-400">
          월 주문{' '}
          <span className="text-white font-semibold">
            {plan.monthly_order_quota === null
              ? '무제한'
              : `${plan.monthly_order_quota.toLocaleString()}건`}
          </span>
        </p>
      </div>

      {/* 기능 목록 */}
      <ul className="space-y-2 flex-1 mb-6">
        {Object.entries(plan.features).map(([key, enabled]) => {
          const label = FEATURE_LABELS[key]
          if (!label) return null
          return (
            <li
              key={key}
              className={`flex items-center gap-2 text-xs ${enabled ? 'text-slate-300' : 'text-slate-600'}`}
            >
              {enabled ? (
                <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 14 14" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 7l3.5 3.5 6.5-7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" fill="none" viewBox="0 0 14 14" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h6" />
                </svg>
              )}
              {label}
            </li>
          )
        })}
      </ul>

      {/* CTA */}
      {isCurrentPlan ? (
        <div className="w-full text-center text-xs font-medium text-indigo-400 py-2.5 rounded-lg border border-indigo-800/50 bg-indigo-950/20">
          현재 사용 중
        </div>
      ) : isEnterprise ? (
        <Link
          href="/support?type=enterprise_inquiry"
          className="w-full text-center block text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 active:bg-slate-800 transition-colors px-4 py-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          문의하기
        </Link>
      ) : isLocked ? (
        <Link
          href="/signup/step-4"
          className="w-full text-center block text-sm font-medium text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300 transition-colors px-4 py-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
        >
          인증 완료 후 선택 →
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="w-full text-sm font-semibold text-white bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg focus:outline-none"
          aria-label={`${plan.name_ko} 플랜 업그레이드 — 결제 연동 준비 중`}
        >
          {isFree ? '현재 무료 이용 중' : '업그레이드 (준비 중)'}
        </button>
      )}
    </div>
  )
}
