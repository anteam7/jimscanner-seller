/**
 * /api/transit-overrides
 *
 * PUT    — (origin_country, method) 단위 운송일수 보정 upsert
 * DELETE — ?country=US&method=air 보정 삭제 (글로벌 시드로 복귀)
 *
 * #idea-5 후속 — 셀러별 transit 평균 override. 2026-05-29
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import { normalizeOriginCountry } from '@/lib/b2b/eta'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_METHOD = ['air', 'boat', 'express', 'ems'] as const

type PutBody = {
  origin_country?: unknown
  method?: unknown
  avg_transit_days?: unknown
  note?: unknown
}

async function resolveAccountId(): Promise<string | null> {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return null
  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  return account?.id ?? null
}

export async function PUT(request: Request) {
  const accountId = await resolveAccountId()
  if (!accountId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  let body: PutBody
  try {
    body = (await request.json()) as PutBody
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  if (typeof body.origin_country !== 'string' || !body.origin_country.trim()) {
    return NextResponse.json({ error: '국가 코드가 필요합니다.' }, { status: 400 })
  }
  const country = normalizeOriginCountry(body.origin_country)

  const methodRaw = typeof body.method === 'string' ? body.method.trim().toLowerCase() : 'air'
  const method = (VALID_METHOD as readonly string[]).includes(methodRaw) ? methodRaw : 'air'

  const n = Number(body.avg_transit_days)
  if (!Number.isFinite(n) || n < 1 || n > 120) {
    return NextResponse.json({ error: '운송일수는 1~120 사이여야 합니다.' }, { status: 400 })
  }
  const avgDays = Math.round(n)

  const note =
    typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 200) : null

  const admin = createAdminClient()
  const { error } = await admin
    .from('b2b_seller_transit_overrides')
    .upsert(
      {
        account_id: accountId,
        origin_country: country,
        method,
        avg_transit_days: avgDays,
        note,
      },
      { onConflict: 'account_id,origin_country,method' },
    )

  if (error) {
    return NextResponse.json({ error: '보정 저장 중 오류: ' + error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, origin_country: country, method, avg_transit_days: avgDays })
}

export async function DELETE(request: Request) {
  const accountId = await resolveAccountId()
  if (!accountId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const url = new URL(request.url)
  const country = normalizeOriginCountry(url.searchParams.get('country') ?? '')
  const methodRaw = (url.searchParams.get('method') ?? 'air').trim().toLowerCase()
  const method = (VALID_METHOD as readonly string[]).includes(methodRaw) ? methodRaw : 'air'
  if (!country) return NextResponse.json({ error: '국가 코드가 필요합니다.' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('b2b_seller_transit_overrides')
    .delete()
    .eq('account_id', accountId)
    .eq('origin_country', country)
    .eq('method', method)

  if (error) {
    return NextResponse.json({ error: '보정 삭제 중 오류: ' + error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
