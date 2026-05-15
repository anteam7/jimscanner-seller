import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let body: { consentedTermIds?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const consentedTermIds = body.consentedTermIds
  if (!Array.isArray(consentedTermIds) || consentedTermIds.length === 0) {
    return NextResponse.json({ error: '약관 동의 정보가 올바르지 않습니다.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  // Verify all required terms are included
  const { data: requiredTerms, error: termsError } = await admin
    .from('b2b_terms_versions')
    .select('id')
    .eq('is_active', true)
    .eq('is_required', true)

  if (termsError) {
    return NextResponse.json({ error: '약관 정보를 불러올 수 없습니다.' }, { status: 500 })
  }

  const requiredIds: string[] = (requiredTerms ?? []).map((t: { id: string }) => t.id)
  const missingRequired = requiredIds.filter((id) => !consentedTermIds.includes(id))
  if (missingRequired.length > 0) {
    return NextResponse.json({ error: '필수 약관에 모두 동의해야 합니다.' }, { status: 400 })
  }

  // Get or create b2b_accounts row (service_role bypasses RLS)
  const { data: existing } = await admin
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  let accountId: string
  if (existing) {
    accountId = existing.id
  } else {
    const { data: created, error: createError } = await admin
      .from('b2b_accounts')
      .insert({ user_id: user.id, email: user.email ?? '' })
      .select('id')
      .single()

    if (createError || !created) {
      return NextResponse.json({ error: '계정 생성에 실패했습니다.' }, { status: 500 })
    }
    accountId = created.id
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null
  const userAgent = req.headers.get('user-agent') ?? null

  const consentRows = (consentedTermIds as string[]).map((termId) => ({
    account_id: accountId,
    terms_version_id: termId,
    ip_address: ip,
    user_agent: userAgent,
  }))

  const { error: consentError } = await admin
    .from('b2b_account_terms_consent')
    .upsert(consentRows, { onConflict: 'account_id,terms_version_id', ignoreDuplicates: true })

  if (consentError) {
    return NextResponse.json({ error: '약관 동의 저장에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
