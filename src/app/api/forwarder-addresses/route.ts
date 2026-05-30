/**
 * GET  /api/forwarder-addresses — 본인 커스텀 + 공용 시드 모두 반환 (RLS 통과).
 * POST /api/forwarder-addresses — 본인 커스텀 주소 등록.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  forwarder_id?: unknown
  label?: unknown
  recipient_name?: unknown
  phone?: unknown
  address1?: unknown
  address2?: unknown
  city?: unknown
  state?: unknown
  zip?: unknown
  country?: unknown
  member_no?: unknown
  is_default?: unknown
  notes?: unknown
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t) return null
  return t.slice(0, max)
}

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

export async function GET() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ addresses: [] })

  const { data } = await sb
    .from('b2b_forwarder_addresses')
    .select(
      'id, account_id, forwarder_id, label, recipient_name, phone, address1, address2, city, state, zip, country, member_no, is_official, is_default, notes, created_at, forwarders(name, slug)',
    )
    .order('is_default', { ascending: false })
    .order('is_official', { ascending: true })
    .order('label', { ascending: true })

  return NextResponse.json({ addresses: data ?? [] })
}

export async function POST(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  if (!isUuid(body.forwarder_id)) {
    return NextResponse.json({ error: '배대지 ID 가 잘못되었습니다.' }, { status: 400 })
  }
  const label = str(body.label, 80)
  const recipient = str(body.recipient_name, 120)
  const address1 = str(body.address1, 200)
  const city = str(body.city, 80)
  const state = str(body.state, 40)
  const zip = str(body.zip, 20)
  if (!label) return NextResponse.json({ error: '라벨이 필요합니다.' }, { status: 400 })
  if (!recipient) return NextResponse.json({ error: '수신자명이 필요합니다.' }, { status: 400 })
  if (!address1) return NextResponse.json({ error: 'address1 이 필요합니다.' }, { status: 400 })
  if (!city) return NextResponse.json({ error: 'city 가 필요합니다.' }, { status: 400 })
  if (!state) return NextResponse.json({ error: 'state 가 필요합니다.' }, { status: 400 })
  if (!zip) return NextResponse.json({ error: 'zip 이 필요합니다.' }, { status: 400 })

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  const admin = createAdminClient()
  const isDefault = body.is_default === true

  // is_default 가 true 면 본인의 다른 기본 주소를 모두 false 로
  if (isDefault) {
    await admin
      .from('b2b_forwarder_addresses')
      .update({ is_default: false })
      .eq('account_id', account.id)
      .eq('is_default', true)
  }

  const { data: row, error } = await admin
    .from('b2b_forwarder_addresses')
    .insert({
      account_id: account.id,
      forwarder_id: body.forwarder_id,
      label,
      recipient_name: recipient,
      phone: str(body.phone, 40),
      address1,
      address2: str(body.address2, 200),
      city,
      state,
      zip,
      country: (str(body.country, 4) ?? 'US').toUpperCase().slice(0, 2),
      member_no: str(body.member_no, 64),
      notes: str(body.notes, 500),
      is_default: isDefault,
      is_official: false,
    })
    .select('id')
    .single()

  if (error || !row) {
    return NextResponse.json({ error: '저장 실패', detail: error?.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, id: row.id }, { status: 201 })
}
