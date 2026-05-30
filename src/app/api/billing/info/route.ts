import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 현재 로그인한 셀러의 구독 요약을 반환한다.
 * 계정 삭제 페이지(/settings/account/delete)가 활성 구독 경고를 띄우기 위해 호출.
 * 구독이 없으면 subscription: null.
 */
export async function GET() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ subscription: null })
  }

  const { data: sub } = await sb
    .from('b2b_subscriptions')
    .select('status, period_end, b2b_subscription_plans(plan_code, name_ko)')
    .eq('account_id', account.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub) {
    return NextResponse.json({ subscription: null })
  }

  const plan = sub.b2b_subscription_plans
  return NextResponse.json({
    subscription: {
      status: sub.status,
      plan_code: plan?.plan_code ?? null,
      plan_name: plan?.name_ko ?? null,
      current_period_end: sub.period_end ?? null,
    },
  })
}
