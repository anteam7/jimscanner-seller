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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawAccount } = await (supabase as any)
    .from('b2b_accounts')
    .select('id, email, business_name, verification_level, verification_status, suspended_at, b2b_subscriptions(b2b_subscription_plans(plan_code))')
    .eq('user_id', user.id)
    .single()

  const account = rawAccount as SellerAccount | null

  if (!account) redirect('/signup')

  if (account.verification_status === 'suspended') redirect('/suspended')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const planCode: string = (rawAccount as any)?.b2b_subscriptions?.[0]?.b2b_subscription_plans?.plan_code ?? 'free'

  return (
    <SellerShell account={account} userEmail={user.email ?? account.email} planCode={planCode}>
      {children}
    </SellerShell>
  )
}
