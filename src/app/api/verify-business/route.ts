import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// NTS 사업자등록정보 진위확인 (공공데이터포털)
// https://www.data.go.kr/data/15081808/openapi.do
const NTS_API_URL = 'https://api.odcloud.kr/api/nts-businessman/v1/status'

type NtsStatus = 'active' | 'suspended' | 'closed' | 'unknown'

interface NtsDataItem {
  b_no: string
  b_stt: string
  b_stt_cd: string
  tax_type?: string
  end_dt?: string
}

interface NtsResponse {
  status_code: string
  data: NtsDataItem[]
}

async function callNtsApi(businessNo: string): Promise<NtsStatus> {
  const apiKey = process.env.NTS_BUSINESS_API_KEY

  // mock mode: API 키 미설정 시 dev 환경에서만 허용
  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      // 개발 환경 mock: 000-00-00000 → 폐업, 나머지 → 계속사업자
      if (businessNo.startsWith('00000')) return 'closed'
      return 'active'
    }
    throw new Error('NTS_BUSINESS_API_KEY 환경변수가 설정되지 않았습니다.')
  }

  const encodedKey = encodeURIComponent(apiKey)
  const url = `${NTS_API_URL}?serviceKey=${encodedKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ b_no: [businessNo] }),
    // 5초 타임아웃
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) {
    throw new Error(`NTS API HTTP 오류: ${res.status}`)
  }

  const json = (await res.json()) as NtsResponse

  if (json.status_code !== 'OK' || !Array.isArray(json.data) || json.data.length === 0) {
    return 'unknown'
  }

  const item = json.data[0]
  if (!item) return 'unknown'

  switch (item.b_stt_cd) {
    case '01': return 'active'
    case '02': return 'suspended'
    case '03': return 'closed'
    default:   return 'unknown'
  }
}

export async function POST() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }
  if (!user.email_confirmed_at) {
    return NextResponse.json({ error: '이메일 인증이 완료되지 않았습니다.' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { data: account, error: fetchError } = await admin
    .from('b2b_accounts')
    .select('business_no, verification_status, verification_level')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (fetchError || !account) {
    return NextResponse.json({ error: '사업자 정보를 찾을 수 없습니다. 4단계로 돌아가 정보를 입력해 주세요.' }, { status: 404 })
  }

  if (!account.business_no || !/^\d{10}$/.test(account.business_no)) {
    return NextResponse.json({ error: '사업자등록번호가 올바르지 않습니다. 4단계로 돌아가 정보를 다시 입력해 주세요.' }, { status: 422 })
  }

  // 이미 L1 이상이면 재확인 불필요
  if (account.verification_level >= 1) {
    return NextResponse.json({ ok: true, status: 'active', alreadyVerified: true })
  }

  let ntsStatus: NtsStatus
  try {
    ntsStatus = await callNtsApi(account.business_no as string)
  } catch (err) {
    const msg = err instanceof Error ? err.message : '알 수 없는 오류'
    return NextResponse.json(
      { error: `국세청 API 연결에 실패했습니다. 잠시 후 다시 시도해 주세요. (${msg})` },
      { status: 502 }
    )
  }

  if (ntsStatus === 'active') {
    const { error: updateError } = await admin
      .from('b2b_accounts')
      .update({
        verification_status: 'business_no_verified',
        verification_level: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: '검증 결과 저장에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, status: 'active' })
  }

  // 휴업·폐업·미등록 — verification_level 은 그대로 0 유지
  const statusLabel: Record<NtsStatus, string> = {
    active: '계속사업자',
    suspended: '휴업',
    closed: '폐업',
    unknown: '미확인',
  }

  return NextResponse.json(
    {
      ok: false,
      status: ntsStatus,
      statusLabel: statusLabel[ntsStatus],
    },
    { status: 422 }
  )
}
