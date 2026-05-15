import { createAdminClient } from '@/lib/auth/admin-supabase'

/**
 * past_due 구독 계정은 신규 주문 생성이 차단됨.
 * true 반환 시 API에서 422 응답해야 함.
 */
export async function isGracePeriodBlocked(userId: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { data: account } = await admin
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!account) return false

  const { data: sub } = await admin
    .from('b2b_subscriptions')
    .select('status')
    .eq('account_id', account.id)
    .single()

  return sub?.status === 'past_due'
}
