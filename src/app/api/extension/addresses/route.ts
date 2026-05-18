/**
 * GET /api/extension/addresses
 * 브라우저 확장이 호출. Bearer 토큰 (b2b_seller_tokens) 인증.
 * 공용 시드 + 셀러 본인 커스텀 주소를 합쳐 반환. is_default 가 맨 위.
 */
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import { authenticateSellerToken } from '@/lib/b2b/seller-tokens'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(request: Request) {
  const auth = await authenticateSellerToken(request)
  if (!auth) {
    return NextResponse.json(
      { error: '유효한 Bearer 토큰이 필요합니다.' },
      { status: 401, headers: CORS_HEADERS },
    )
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('b2b_forwarder_addresses')
    .select(
      'id, account_id, forwarder_id, label, recipient_name, phone, address1, address2, city, state, zip, country, member_no, is_official, is_default, notes, forwarders(name, slug)',
    )
    .or(`account_id.is.null,account_id.eq.${auth.account_id}`)
    .order('is_default', { ascending: false })
    .order('is_official', { ascending: true })
    .order('label', { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: '조회 실패', detail: error.message },
      { status: 500, headers: CORS_HEADERS },
    )
  }

  return NextResponse.json({ addresses: data ?? [] }, { headers: CORS_HEADERS })
}
