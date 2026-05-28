/**
 * /api/payment-cards/[id]
 *
 * PATCH  — 카드 정보 수정 (alias / brand / last4 / color / credit_limit / billing_day / sort_order / is_active / notes)
 * DELETE — soft delete (deleted_at 세팅). 카드를 참조하는 b2b_order_items.payment_card_id 는 set null 되지 않음 — soft delete 이므로.
 *           hard delete 가 필요하면 deleted_at 세팅된 row 만 DB 차원에서 따로.
 *
 * #idea-4 — 2026-05-28
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import type { Database } from '../../../../../types/supabase'

type CardUpdate = Database['public']['Tables']['b2b_payment_cards']['Update']

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_BRAND = ['visa', 'master', 'amex', 'jcb', 'unionpay', 'domestic', 'other'] as const

type PatchBody = {
  alias?: string | null
  brand?: string | null
  last4?: string | null
  color?: string | null
  credit_limit_krw?: number | string | null
  billing_day?: number | string | null
  sort_order?: number | string | null
  is_active?: boolean
  notes?: string | null
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

async function loadOwnedCard(
  userId: string,
  cardId: string,
): Promise<{ ok: true; accountId: string } | { ok: false; status: number; error: string }> {
  const admin = createAdminClient()
  const { data: account } = await admin
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', userId)
    .single()
  if (!account) return { ok: false, status: 404, error: '사업자 계정이 없습니다.' }

  const { data: card } = await admin
    .from('b2b_payment_cards')
    .select('id, account_id, deleted_at')
    .eq('id', cardId)
    .single()
  if (!card || card.account_id !== account.id || card.deleted_at != null) {
    return { ok: false, status: 404, error: '카드를 찾을 수 없습니다.' }
  }
  return { ok: true, accountId: account.id }
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  if (!isUuid(id)) return NextResponse.json({ error: '잘못된 ID 입니다.' }, { status: 400 })

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const owned = await loadOwnedCard(user.id, id)
  if (!owned.ok) return NextResponse.json({ error: owned.error }, { status: owned.status })

  let body: PatchBody
  try {
    body = (await request.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const patch: CardUpdate = {}

  if (body.alias !== undefined) {
    const v = (body.alias ?? '').toString().trim()
    if (!v) return NextResponse.json({ error: '카드 별칭이 필요합니다.' }, { status: 400 })
    if (v.length > 60) return NextResponse.json({ error: '카드 별칭이 너무 깁니다.' }, { status: 400 })
    patch.alias = v
  }
  if (body.brand !== undefined) {
    const v = body.brand == null ? null : body.brand.toString().trim()
    if (v && !(VALID_BRAND as readonly string[]).includes(v)) {
      return NextResponse.json({ error: '브랜드 값이 올바르지 않습니다.' }, { status: 400 })
    }
    patch.brand = v || null
  }
  if (body.last4 !== undefined) {
    const v = body.last4 == null ? null : body.last4.toString().trim()
    if (v && !/^[0-9]{4}$/.test(v)) {
      return NextResponse.json({ error: '마지막 4자리는 숫자 4자리여야 합니다.' }, { status: 400 })
    }
    patch.last4 = v || null
  }
  if (body.color !== undefined) {
    const v = body.color == null ? null : body.color.toString().trim().slice(0, 24)
    patch.color = v || null
  }
  if (body.credit_limit_krw !== undefined) {
    if (body.credit_limit_krw == null || body.credit_limit_krw === '') {
      patch.credit_limit_krw = null
    } else {
      const n = Number(body.credit_limit_krw)
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: '카드 한도가 올바르지 않습니다.' }, { status: 400 })
      }
      patch.credit_limit_krw = Math.round(n)
    }
  }
  if (body.billing_day !== undefined) {
    if (body.billing_day == null || body.billing_day === '') {
      patch.billing_day = null
    } else {
      const n = Number(body.billing_day)
      if (!Number.isFinite(n) || n < 1 || n > 31) {
        return NextResponse.json({ error: '결제일은 1~31 사이여야 합니다.' }, { status: 400 })
      }
      patch.billing_day = Math.round(n)
    }
  }
  if (body.sort_order !== undefined) {
    const n = Number(body.sort_order)
    if (Number.isFinite(n)) patch.sort_order = Math.round(n)
  }
  if (body.is_active !== undefined) {
    patch.is_active = body.is_active === true
  }
  if (body.notes !== undefined) {
    const v = body.notes == null ? null : body.notes.toString().trim().slice(0, 500)
    patch.notes = v || null
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, noop: true })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('b2b_payment_cards')
    .update(patch)
    .eq('id', id)
    .eq('account_id', owned.accountId)

  if (error) {
    return NextResponse.json({ error: '수정 중 오류: ' + error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  if (!isUuid(id)) return NextResponse.json({ error: '잘못된 ID 입니다.' }, { status: 400 })

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const owned = await loadOwnedCard(user.id, id)
  if (!owned.ok) return NextResponse.json({ error: owned.error }, { status: owned.status })

  const admin = createAdminClient()
  const { error } = await admin
    .from('b2b_payment_cards')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id)
    .eq('account_id', owned.accountId)

  if (error) {
    return NextResponse.json({ error: '삭제 중 오류: ' + error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
