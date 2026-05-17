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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: plans }, { data: accountData }] = await Promise.all([
    (supabase as any)
      .from('b2b_subscription_plans')
      .select(
        'id, plan_code, name_ko, description, price_krw_monthly, price_krw_yearly, monthly_order_quota, required_verification_level, features, display_order'
      )
      .order('display_order'),
    (supabase as any)
      .from('b2b_accounts')
      .select(
        'verification_level, b2b_subscriptions(b2b_subscription_plans(plan_code))'
      )
      .eq('user_id', user.id)
      .single(),
  ])

  const currentPlanCode: string =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (accountData as any)?.b2b_subscriptions?.[0]?.b2b_subscription_plans?.plan_code ?? 'free'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const verificationLevel: number = (accountData as any)?.verification_level ?? 0

  return (
    <PricingPageClient
      plans={(plans as PlanData[]) ?? []}
      currentPlanCode={currentPlanCode}
      verificationLevel={verificationLevel}
    />
  )
}
