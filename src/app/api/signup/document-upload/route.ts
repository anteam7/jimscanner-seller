import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const BUCKET = 'b2b-documents'

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

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '파일이 첨부되지 않았습니다.' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'JPG, PNG, PDF 파일만 업로드 가능합니다.' }, { status: 415 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: '파일 크기는 5MB 이하여야 합니다.' }, { status: 413 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  // 버킷이 없으면 자동 생성 (이미 존재하면 무시)
  await admin.storage.createBucket(BUCKET, { public: false }).catch(() => {})

  const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg'
  const path = `${user.id}/business-license-${Date.now()}.${ext}`

  const arrayBuffer = await file.arrayBuffer()

  const { error: storageError } = await admin.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (storageError) {
    console.error('Storage upload error:', storageError)
    return NextResponse.json(
      { error: '파일 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    )
  }

  const { error: updateError } = await admin
    .from('b2b_accounts')
    .update({
      verification_status: 'document_pending_review',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (updateError) {
    console.error('Account status update error:', updateError)
  }

  return NextResponse.json({ ok: true, path })
}
