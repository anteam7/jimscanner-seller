import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date().toISOString()
  const { data: rows, error } = await supabase
    .from('b2b_announcements')
    .select('id,type,title,body_markdown,starts_at,ends_at,target_plan_codes')
    .lt('starts_at', now)
    .gt('ends_at', now)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[announcements/active] DB 오류:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const annRows = rows ?? []
  if (annRows.length === 0) return NextResponse.json([])

  let planCode: string | null = null
  const needsPlanFilter = annRows.some(
    (a) => Array.isArray(a.target_plan_codes) && a.target_plan_codes.length > 0,
  )

  if (needsPlanFilter) {
    const { data: account } = await supabase
      .from('b2b_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (account) {
      const { data: sub } = await supabase
        .from('b2b_subscriptions')
        .select('b2b_subscription_plans(plan_code)')
        .eq('account_id', account.id)
        .maybeSingle()
      planCode = sub?.b2b_subscription_plans?.plan_code ?? null
    }
  }

  const filtered = annRows.filter((ann) => {
    const codes = ann.target_plan_codes
    if (!codes || codes.length === 0) return true
    return planCode ? codes.includes(planCode) : false
  })

  return NextResponse.json(
    filtered.map(({ target_plan_codes: _tc, ...rest }) => rest),
  )
}
