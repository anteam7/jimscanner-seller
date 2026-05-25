import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { getExchangeRates } from '@/lib/b2b/exchange-rate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  // getExchangeRates 는 static fallback 까지 보장되므로 항상 200 OK.
  const rates = await getExchangeRates()
  return NextResponse.json(rates)
}
