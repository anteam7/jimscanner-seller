import type { Metadata } from 'next'
import { createClient } from '@/lib/auth/server'
import PricingPageClient from './PricingPageClient'
import type { PlanData } from '@/components/b2b/PricingCard'

export const metadata: Metadata = {
  title: '플랜 선택',
  robots: { index: false },
}

export default async function PricingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: plans }, { data: accountData }] = await Promise.all([
    supabase
      .from('b2b_subscription_plans')
      .select(
        'id, plan_code, name_ko, description, price_krw_monthly, price_krw_yearly, monthly_order_quota, required_verification_level, features, display_order'
      )
      .order('display_order'),
    supabase
      .from('b2b_accounts')
      .select(
        'verification_level, b2b_subscriptions(b2b_subscription_plans(plan_code))'
      )
      .eq('user_id', user.id)
      .single(),
  ])

  const subscriptions = accountData?.b2b_subscriptions
  const firstSub = Array.isArray(subscriptions) ? subscriptions[0] : subscriptions
  const planRel = firstSub?.b2b_subscription_plans
  const planRow = Array.isArray(planRel) ? planRel[0] : planRel
  const currentPlanCode: string = planRow?.plan_code ?? 'free'
  const verificationLevel: number = accountData?.verification_level ?? 0

  return (
    <PricingPageClient
      plans={(plans as PlanData[]) ?? []}
      currentPlanCode={currentPlanCode}
      verificationLevel={verificationLevel}
    />
  )
}
