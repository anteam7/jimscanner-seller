import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface BusinessInfoBody {
  businessNo?: unknown
  businessName?: unknown
  ceoName?: unknown
  businessType?: unknown
  categoryMain?: unknown
  categorySub?: unknown
  phone?: unknown
  postalCode?: unknown
  address?: unknown
  detailAddress?: unknown
}

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }
  if (!user.email_confirmed_at) {
    return NextResponse.json({ error: '이메일 인증이 완료되지 않았습니다.' }, { status: 403 })
  }

  let body: BusinessInfoBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const businessNo = typeof body.businessNo === 'string' ? body.businessNo.replace(/\D/g, '') : ''
  const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : ''
  const ceoName = typeof body.ceoName === 'string' ? body.ceoName.trim() : ''
  const businessType = body.businessType
  const categoryMain = typeof body.categoryMain === 'string' ? body.categoryMain.trim() : ''
  const categorySub = typeof body.categorySub === 'string' ? body.categorySub.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const postalCode = typeof body.postalCode === 'string' ? body.postalCode.trim() : ''
  const address = typeof body.address === 'string' ? body.address.trim() : ''
  const detailAddress = typeof body.detailAddress === 'string' ? body.detailAddress.trim() : ''

  if (!/^\d{10}$/.test(businessNo)) {
    return NextResponse.json({ error: '사업자등록번호는 10자리 숫자여야 합니다.' }, { status: 400 })
  }
  if (!businessName) return NextResponse.json({ error: '상호를 입력해 주세요.' }, { status: 400 })
  if (!ceoName) return NextResponse.json({ error: '대표자명을 입력해 주세요.' }, { status: 400 })
  if (businessType !== '개인사업자' && businessType !== '법인사업자') {
    return NextResponse.json({ error: '사업자 유형이 올바르지 않습니다.' }, { status: 400 })
  }
  if (!categoryMain) return NextResponse.json({ error: '업태를 입력해 주세요.' }, { status: 400 })
  if (!categorySub) return NextResponse.json({ error: '종목을 입력해 주세요.' }, { status: 400 })
  if (!phone) return NextResponse.json({ error: '전화번호를 입력해 주세요.' }, { status: 400 })
  if (!postalCode) return NextResponse.json({ error: '우편번호를 입력해 주세요.' }, { status: 400 })
  if (!address) return NextResponse.json({ error: '주소를 입력해 주세요.' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  // Check duplicate business_no (excluding current user)
  const { data: dupCheck } = await admin
    .from('b2b_accounts')
    .select('id, user_id')
    .eq('business_no', businessNo)
    .is('deleted_at', null)
    .maybeSingle()

  if (dupCheck && dupCheck.user_id !== user.id) {
    return NextResponse.json(
      { error: '이미 등록된 사업자등록번호입니다. 문의가 필요하시면 고객센터로 연락해 주세요.' },
      { status: 409 }
    )
  }

  const { error: upsertError } = await admin
    .from('b2b_accounts')
    .upsert(
      {
        user_id: user.id,
        email: user.email ?? '',
        business_no: businessNo,
        business_name: businessName,
        ceo_name: ceoName,
        business_type: businessType,
        business_category_main: categoryMain,
        business_category_sub: categorySub,
        phone,
        postal_code: postalCode,
        address,
        detail_address: detailAddress || null,
        verification_status: 'business_no_pending',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (upsertError) {
    if (upsertError.code === '23505') {
      return NextResponse.json(
        { error: '이미 등록된 사업자등록번호입니다.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
