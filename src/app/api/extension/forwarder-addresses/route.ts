/**
 * POST /api/extension/forwarder-addresses
 *
 * 확장이 amazon checkout panel 에서 공용 주소 [⭐ 내 주소로 추가] 클릭 시 호출.
 * 공용 주소 데이터를 셀러 본인 주소로 즉시 등록 (영문이름·회원번호 비어있음 — 셀러가 짐스캐너에서 보강).
 *
 * 인증: Bearer (b2b_seller_tokens)
 */
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import { authenticateSellerToken } from '@/lib/b2b/seller-tokens'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
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

export async function POST(request: Request) {
  const auth = await authenticateSellerToken(request)
  if (!auth) {
    return NextResponse.json({ error: '유효한 Bearer 토큰이 필요합니다.' }, { status: 401, headers: CORS_HEADERS })
  }

  let body: Record<string, unknown>
  try { body = (await request.json()) as Record<string, unknown> } catch {
    return NextResponse.json({ error: 'JSON 본문이 잘못되었습니다.' }, { status: 400, headers: CORS_HEADERS })
  }

  // 옵션 A: source_address_id 로 공용 주소 복제
  const sourceId = isUuid(body.source_address_id) ? body.source_address_id : null

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adb = admin as any

  let payload: Record<string, unknown>
  if (sourceId) {
    const { data: src } = await adb
      .from('b2b_forwarder_addresses')
      .select('forwarder_id, label, phone, address1, address2, city, state, zip, country, notes')
      .eq('id', sourceId)
      .is('account_id', null)
      .eq('is_official', true)
      .maybeSingle()
    if (!src) {
      return NextResponse.json({ error: '공용 주소를 찾을 수 없습니다.' }, { status: 404, headers: CORS_HEADERS })
    }
    payload = {
      account_id: auth.account_id,
      forwarder_id: src.forwarder_id,
      label: String(src.label) + ' (내 주소)',
      recipient_name: '(영문이름 입력 필요)',
      phone: src.phone,
      address1: src.address1,
      address2: src.address2,
      city: src.city,
      state: src.state,
      zip: src.zip,
      country: src.country,
      member_no: null,
      is_official: false,
      is_default: false,
      notes: src.notes,
    }
  } else {
    // 옵션 B: 직접 필드 입력 (확장에서 form 데이터 그대로 전송)
    const forwarderId = isUuid(body.forwarder_id) ? body.forwarder_id : null
    const address1 = str(body.address1, 300)
    const city = str(body.city, 100)
    const state = str(body.state, 50)
    const zip = str(body.zip, 20)
    const country = str(body.country, 4)
    if (!forwarderId || !address1 || !city || !state || !zip || !country) {
      return NextResponse.json({ error: '필수 주소 필드 누락' }, { status: 400, headers: CORS_HEADERS })
    }
    payload = {
      account_id: auth.account_id,
      forwarder_id: forwarderId,
      label: str(body.label, 100) ?? '확장에서 추가',
      recipient_name: str(body.recipient_name, 200) ?? '(영문이름 입력 필요)',
      phone: str(body.phone, 40),
      address1,
      address2: str(body.address2, 200),
      city,
      state,
      zip,
      country,
      member_no: str(body.member_no, 64),
      is_official: false,
      is_default: false,
      notes: str(body.notes, 1000),
    }
  }

  const { data, error } = await adb
    .from('b2b_forwarder_addresses')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: '저장 실패', detail: error.message }, { status: 500, headers: CORS_HEADERS })
  }
  return NextResponse.json({ ok: true, id: data.id }, { status: 201, headers: CORS_HEADERS })
}
