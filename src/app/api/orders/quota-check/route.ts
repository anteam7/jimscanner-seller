import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export type QuotaStatus = {
  plan_code: string
  plan_name_ko: string
  monthly_order_quota: number | null
  monthly_order_used: number
  quota_override: number | null
  effective_quota: number | null
  remaining: number | null
  is_unlimited: boolean
  over_quota: boolean
  warn_80pct: boolean
  /** true이면 결제 실패 grace period 중 — 신규 주문 생성 불가 */
  grace_period_blocked: boolean
}

const FREE_FALLBACK: QuotaStatus = {
  plan_code: 'free',
  plan_name_ko: 'Free',
  monthly_order_quota: 30,
  monthly_order_used: 0,
  quota_override: null,
  effective_quota: 30,
  remaining: 30,
  is_unlimited: false,
  over_quota: false,
  warn_80pct: false,
  grace_period_blocked: false,
}

export async function GET() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any

  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })
  }

  const { data: sub } = await db
    .from('b2b_subscriptions')
    .select(
      'monthly_order_used, monthly_order_quota_override, status, b2b_subscription_plans(plan_code, name_ko, monthly_order_quota)'
    )
    .eq('account_id', account.id)
    .single()

  if (!sub) {
    return NextResponse.json(FREE_FALLBACK)
  }

  const plan = sub.b2b_subscription_plans as {
    plan_code: string
    name_ko: string
    monthly_order_quota: number | null
  } | null

  const planQuota: number | null = plan?.monthly_order_quota ?? null
  const effectiveQuota: number | null = sub.monthly_order_quota_override ?? planQuota
  const used: number = sub.monthly_order_used ?? 0
  const isUnlimited = effectiveQuota === null
  const remaining = isUnlimited ? null : Math.max(0, effectiveQuota! - used)
  const overQuota = !isUnlimited && used >= effectiveQuota!
  const warn80pct = !isUnlimited && effectiveQuota! > 0 && used / effectiveQuota! >= 0.8
  const gracePeriodBlocked = sub.status === 'past_due'

  return NextResponse.json({
    plan_code: plan?.plan_code ?? 'free',
    plan_name_ko: plan?.name_ko ?? 'Free',
    monthly_order_quota: planQuota,
    monthly_order_used: used,
    quota_override: sub.monthly_order_quota_override ?? null,
    effective_quota: effectiveQuota,
    remaining,
    is_unlimited: isUnlimited,
    over_quota: overQuota,
    warn_80pct: warn80pct,
    grace_period_blocked: gracePeriodBlocked,
  } satisfies QuotaStatus)
}
