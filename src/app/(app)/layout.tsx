import { redirect } from 'next/navigation'
import { createClient } from '@/lib/auth/server'
import SellerShell, { type SellerAccount } from '@/components/b2b/SellerShell'

export default async function SellerAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: rawAccount } = await supabase
    .from('b2b_accounts')
    .select('id, email, business_name, verification_level, verification_status, suspended_at, b2b_subscriptions(b2b_subscription_plans(plan_code))')
    .eq('user_id', user.id)
    .single()

  const account = rawAccount as SellerAccount | null

  if (!account) redirect('/signup')

  if (account.verification_status === 'suspended') redirect('/suspended')

  const subscriptions = rawAccount?.b2b_subscriptions
  const firstSub = Array.isArray(subscriptions) ? subscriptions[0] : subscriptions
  const planRel = firstSub?.b2b_subscription_plans
  const planRow = Array.isArray(planRel) ? planRel[0] : planRel
  const planCode: string = planRow?.plan_code ?? 'free'

  return (
    <SellerShell account={account} userEmail={user.email ?? account.email} planCode={planCode}>
      {children}
    </SellerShell>
  )
}
