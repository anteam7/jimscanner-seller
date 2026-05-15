import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

const WINDOW_MS = 5 * 60 * 1000
const MAX_REQUESTS = 3

// In-memory rate limit: email → sorted timestamp array
const rateMap = new Map<string, number[]>()

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  // 윈도우 밖 만료 엔트리 제거
  const active = (rateMap.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  // 만료 후 남은 엔트리가 없으면 키 삭제 (메모리 해제)
  if (active.length === 0 && rateMap.has(key)) rateMap.delete(key)
  // 현재 요청 추가
  const timestamps = [...active, now]
  rateMap.set(key, timestamps)
  // 비정상 누적 방어
  if (rateMap.size > 5000) rateMap.clear()
  return timestamps.length > MAX_REQUESTS
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  if (checkRateLimit(email)) {
    return NextResponse.json(
      { error: '요청 횟수가 초과되었습니다. 5분 후 다시 시도해 주세요.' },
      { status: 429 }
    )
  }

  const origin = new URL(req.url).origin
  const supabase = await createClient()

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/api/auth/callback?type=recovery`,
  })

  // 계정 열거 방지 — 존재하지 않는 이메일도 항상 성공 반환
  return NextResponse.json({ ok: true })
}
