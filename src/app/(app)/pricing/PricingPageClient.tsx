'use client'

import { useState } from 'react'
import Link from 'next/link'
import PricingCard, { type PlanData } from '@/components/b2b/PricingCard'

const COMMON_FEATURES = [
  '30+ 배대지 양식 자동 변환',
  '한국수출입은행 환율 실시간 적용',
  '마켓 구매자 PII + 통관코드 안전 보관',
  '국세청 사업자 진위 확인 (자동)',
  '합배송 자동 묶기 + xlsx 다운로드',
  'TLS 암호화 + RLS 본인 데이터만 격리',
]

export default function PricingPageClient({
  plans,
  currentPlanCode,
  verificationLevel,
}: {
  plans: PlanData[]
  currentPlanCode: string
  verificationLevel: number
}) {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      {/* 헤더 */}
      <div>
        <span className="inline-flex items-center gap-1.5 mb-3 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-[11px] font-semibold text-indigo-700">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          PLANS &amp; BILLING
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          사업 규모에 맞는{' '}
          <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">
            플랜 선택
          </span>
        </h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">
          무료로 시작하고 주문량이 늘면 언제든지 업그레이드. 연간 결제로 ~17% 절감 가능합니다.
        </p>
      </div>

      {/* 월간/연간 토글 */}
      <div
        role="group"
        aria-label="결제 주기 선택"
        className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1"
      >
        <button
          type="button"
          aria-pressed={billing === 'monthly'}
          onClick={() => setBilling('monthly')}
          className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
            ${billing === 'monthly'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-900'
            }`}
        >
          월간 결제
        </button>
        <button
          type="button"
          aria-pressed={billing === 'yearly'}
          onClick={() => setBilling('yearly')}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
            ${billing === 'yearly'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-900'
            }`}
        >
          연간 결제
          <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
            ~17% 할인
          </span>
        </button>
      </div>

      {/* 플랜 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        {plans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={plan.plan_code === currentPlanCode}
            isLocked={
              plan.plan_code !== 'enterprise' &&
              plan.required_verification_level > verificationLevel
            }
            billingPeriod={billing}
          />
        ))}
      </div>

      {/* 공통 기능 */}
      <div className="rounded-xl border border-slate-200 border-l-[3px] border-l-emerald-500 bg-gradient-to-br from-emerald-50/30 to-white shadow-sm p-6">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              모든 플랜 공통
            </p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">
              운영 자동화 핵심 기능은 무료 플랜에도 모두 포함됩니다
            </p>
          </div>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {COMMON_FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
              <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* 하단 안내 */}
      <p className="text-xs text-slate-400 text-center pb-2">
        플랜에 대해 궁금한 점이 있으신가요?{' '}
        <Link
          href="/support?type=plan_inquiry"
          className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded"
        >
          1:1 문의하기
        </Link>
      </p>
    </div>
  )
}
