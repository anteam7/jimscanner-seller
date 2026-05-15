import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Resolve the user's current plan_code for target_plan_codes filtering
  let planCode: string | null = null
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (account) {
    const { data: sub } = await db
      .from('b2b_subscriptions')
      .select('plan_code')
      .eq('account_id', account.id)
      .maybeSingle()
    planCode = sub?.plan_code ?? null
  }

  const now = new Date().toISOString()
  const { data, error } = await db
    .from('b2b_announcements')
    .select('id,type,title,body_markdown,starts_at,ends_at,target_plan_codes')
    .lt('starts_at', now)
    .gt('ends_at', now)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[announcements/active] DB 오류:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter by plan code:
  // - empty target_plan_codes = show to all plans
  // - non-empty = show only to matching plan
  type AnnRow = { target_plan_codes: string[] | null; [key: string]: unknown }
  const filtered = (data as AnnRow[] ?? []).filter((ann) => {
    const codes = ann.target_plan_codes
    if (!codes || codes.length === 0) return true
    return planCode ? codes.includes(planCode) : false
  })

  return NextResponse.json(
    filtered.map(({ target_plan_codes: _tc, ...rest }) => rest),
  )
}
