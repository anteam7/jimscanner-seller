/**
 * POST /api/extension/form-snapshot
 *
 * 브라우저 확장의 [📋 배송신청서 HTML 캡쳐] 버튼이 호출.
 * 셀러가 배대지 사이트의 배송신청서 페이지를 열고 클릭하면 form 영역 HTML +
 * 필드 메타데이터를 업로드. 짐스캐너 팀이 보고 자동입력 selector 매핑 작성.
 *
 * 인증: Bearer (b2b_seller_tokens)
 *
 * Body:
 * {
 *   url: string,
 *   page_title?: string,
 *   html_excerpt?: string,
 *   fields?: Array<...>,
 *   forwarder_slug?: string,
 *   user_note?: string
 * }
 */
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import { authenticateSellerToken } from '@/lib/b2b/seller-tokens'
import type { Database, Json } from '../../../../../types/supabase'

type FormSnapshotInsert = Database['public']['Tables']['b2b_forwarder_form_snapshots']['Insert']

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
}

const MAX_HTML = 200_000
const MAX_FIELDS = 200

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t) return null
  return t.slice(0, max)
}

export async function POST(request: Request) {
  const auth = await authenticateSellerToken(request)
  if (!auth) {
    return NextResponse.json(
      { error: '유효한 Bearer 토큰이 필요합니다.' },
      { status: 401, headers: CORS_HEADERS },
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'JSON 본문이 잘못되었습니다.' }, { status: 400, headers: CORS_HEADERS })
  }

  const url = str(body.url, 1000)
  if (!url) {
    return NextResponse.json({ error: 'url 이 필요합니다.' }, { status: 400, headers: CORS_HEADERS })
  }

  const pageTitle = str(body.page_title, 200)
  const htmlExcerpt = str(body.html_excerpt, MAX_HTML)
  const forwarderSlug = str(body.forwarder_slug, 64)
  const userNote = str(body.user_note, 500)

  const fieldsRaw = Array.isArray(body.fields) ? body.fields : []
  const fields = fieldsRaw.slice(0, MAX_FIELDS)

  const admin = createAdminClient()

  // slug → forwarder_id 매핑 (있으면)
  let forwarderId: string | null = null
  if (forwarderSlug) {
    const { data: fwd } = await admin
      .from('forwarders')
      .select('id')
      .eq('slug', forwarderSlug)
      .maybeSingle()
    if (fwd) forwarderId = fwd.id
  }

  const payload: FormSnapshotInsert = {
    account_id: auth.account_id,
    forwarder_id: forwarderId,
    forwarder_slug: forwarderSlug,
    url,
    page_title: pageTitle,
    html_excerpt: htmlExcerpt,
    fields: fields as Json,
    user_note: userNote,
  }

  const { data: row, error } = await admin
    .from('b2b_forwarder_form_snapshots')
    .insert(payload)
    .select('id')
    .single()

  if (error || !row) {
    return NextResponse.json(
      { error: '저장 실패', detail: error?.message },
      { status: 500, headers: CORS_HEADERS },
    )
  }
  return NextResponse.json(
    { ok: true, id: row.id },
    { status: 201, headers: CORS_HEADERS },
  )
}
