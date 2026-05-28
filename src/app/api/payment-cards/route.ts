/**
 * /api/payment-cards
 *
 * GET  — 본인 계정 결제 카드 목록 (active 우선, sort_order asc)
 * POST — 신규 카드 등록
 *
 * #idea-4 — 2026-05-28
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_BRAND = ['visa', 'master', 'amex', 'jcb', 'unionpay', 'domestic', 'other'] as const

type PostBody = {
  alias?: unknown
  brand?: unknown
  last4?: unknown
  color?: unknown
  credit_limit_krw?: unknown
  billing_day?: unknown
  sort_order?: unknown
  notes?: unknown
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t) return null
  return t.slice(0, max)
}

export async function GET() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ cards: [] })

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return NextResponse.json({ cards: [] })

  const admin = createAdminClient()
  const { data } = await admin
    .from('b2b_payment_cards')
    .select(
      'id, account_id, alias, brand, last4, color, credit_limit_krw, billing_day, sort_order, is_active, notes, created_at, updated_at',
    )
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .order('is_active', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return NextResponse.json({ cards: data ?? [] })
}

export async function POST(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  let body: PostBody
  try {
    body = (await request.json()) as PostBody
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const alias = str(body.alias, 60)
  if (!alias) return NextResponse.json({ error: '카드 별칭이 필요합니다.' }, { status: 400 })

  const brandRaw = str(body.brand, 20)
  const brand =
    brandRaw && (VALID_BRAND as readonly string[]).includes(brandRaw) ? brandRaw : null

  const last4Raw = str(body.last4, 4)
  if (last4Raw && !/^[0-9]{4}$/.test(last4Raw)) {
    return NextResponse.json({ error: '마지막 4자리는 숫자 4자리여야 합니다.' }, { status: 400 })
  }
  const last4 = last4Raw ?? null

  const color = str(body.color, 24)
  const notes = str(body.notes, 500)

  let creditLimit: number | null = null
  if (body.credit_limit_krw != null && body.credit_limit_krw !== '') {
    const n = Number(body.credit_limit_krw)
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: '카드 한도가 올바르지 않습니다.' }, { status: 400 })
    }
    creditLimit = Math.round(n)
  }

  let billingDay: number | null = null
  if (body.billing_day != null && body.billing_day !== '') {
    const n = Number(body.billing_day)
    if (!Number.isFinite(n) || n < 1 || n > 31) {
      return NextResponse.json({ error: '결제일은 1~31 사이여야 합니다.' }, { status: 400 })
    }
    billingDay = Math.round(n)
  }

  let sortOrder = 0
  if (body.sort_order != null && body.sort_order !== '') {
    const n = Number(body.sort_order)
    if (Number.isFinite(n)) sortOrder = Math.round(n)
  }

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  const admin = createAdminClient()
  const { data: inserted, error } = await admin
    .from('b2b_payment_cards')
    .insert({
      account_id: account.id,
      alias,
      brand,
      last4,
      color,
      credit_limit_krw: creditLimit,
      billing_day: billingDay,
      sort_order: sortOrder,
      notes,
    })
    .select('id, alias')
    .single()

  if (error || !inserted) {
    return NextResponse.json(
      { error: '카드 등록 중 오류: ' + (error?.message ?? 'unknown') },
      { status: 500 },
    )
  }
  return NextResponse.json({ ok: true, id: inserted.id })
}
