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

  // 먼저 announcements 자체를 시도 — 테이블 미존재 / 결과 빈 경우 account/subscription 조회 skip.
  const now = new Date().toISOString()
  const { data: rows, error } = await db
    .from('b2b_announcements')
    .select('id,type,title,body_markdown,starts_at,ends_at,target_plan_codes')
    .lt('starts_at', now)
    .gt('ends_at', now)
    .order('created_at', { ascending: false })

  if (error) {
    // b2b_announcements 테이블 미존재(42P01) — 기능 비활성 상태에서는 조용히 빈 배열 반환.
    if (error.code === '42P01') return NextResponse.json([])
    console.error('[announcements/active] DB 오류:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  type AnnRow = { target_plan_codes: string[] | null; [key: string]: unknown }
  const annRows = (rows as AnnRow[]) ?? []
  if (annRows.length === 0) return NextResponse.json([])

  // 활성 공지가 있을 때만 plan_code 조회 (target_plan_codes 필터링용)
  let planCode: string | null = null
  const needsPlanFilter = annRows.some(
    (a) => Array.isArray(a.target_plan_codes) && a.target_plan_codes.length > 0,
  )

  if (needsPlanFilter) {
    const { data: account } = await db
      .from('b2b_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (account) {
      const { data: sub } = await db
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
