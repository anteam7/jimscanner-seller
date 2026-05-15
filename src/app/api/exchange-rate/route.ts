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

  try {
    const rates = await getExchangeRates()
    return NextResponse.json(rates)
  } catch {
    return NextResponse.json(
      { error: '환율 정보를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 503 }
    )
  }
}
