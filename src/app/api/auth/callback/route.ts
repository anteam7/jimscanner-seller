import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (errorParam) {
    const msg = encodeURIComponent(errorDescription ?? errorParam)
    return NextResponse.redirect(`${origin}/seller/auth/callback?error=${msg}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/seller/login`)
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    const msg = encodeURIComponent(exchangeError.message)
    return NextResponse.redirect(`${origin}/seller/auth/callback?error=${msg}`)
  }

  const type = searchParams.get('type')
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/seller/auth/reset-password`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/seller/login`)
  }

  const admin = createAdminClient() as any
  const { data: account } = await admin
    .from('b2b_accounts')
    .select('business_no, verification_level, verification_status')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!account || !account.business_no) {
    return NextResponse.redirect(`${origin}/seller/signup/step-4`)
  }

  if (account.verification_level === 0) {
    return NextResponse.redirect(`${origin}/seller/signup/step-5`)
  }

  if (account.verification_status === 'business_no_verified') {
    return NextResponse.redirect(`${origin}/seller/signup/step-6`)
  }

  return NextResponse.redirect(`${origin}/seller/dashboard`)
}
