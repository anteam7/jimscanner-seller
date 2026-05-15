'use client'

import { useState } from 'react'
import Link from 'next/link'
import PricingCard, { type PlanData } from '@/components/b2b/PricingCard'

const COMMON_FEATURES = [
  '33개 배대지 실시간 환율 비교',
  '주문 메모 + 의뢰자 정보 보관',
  '국세청 사업자 진위 확인',
  'TLS 암호화 데이터 전송',
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
    <div className="p-6 space-y-8 max-w-5xl">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">플랜 선택</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          사업 규모에 맞는 플랜을 선택하세요. 언제든지 변경 가능합니다.
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
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          모든 플랜에 포함
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {COMMON_FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-xs text-slate-500">
              <svg className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 14 14" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 7l3.5 3.5 6.5-7" />
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
