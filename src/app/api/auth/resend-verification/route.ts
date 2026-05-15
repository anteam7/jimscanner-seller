import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export async function POST(req: NextRequest) {
  const { origin } = new URL(req.url)
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim() : null

  if (!email) {
    return NextResponse.json({ error: '이메일이 필요합니다.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${origin}/api/auth/callback`,
    },
  })

  if (error) {
    return NextResponse.json({ error: '재발송에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
