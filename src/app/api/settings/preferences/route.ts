import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PATCH /api/settings/preferences
 * 셀러 계정 단위 환경설정 저장 (기기 간 동기화).
 * - free_storage_days: 배대지 무료 보관일 (1~60, null=기본 7)
 * - automatch_threshold: 영수증 자동 매칭 안전 임계값 (70~95, null=기본 90)
 */
export async function PATCH(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let body: { free_storage_days?: unknown; automatch_threshold?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const patch: { free_storage_days?: number | null; automatch_threshold?: number | null } = {}

  if ('free_storage_days' in body) {
    const v = body.free_storage_days
    if (v === null) patch.free_storage_days = null
    else {
      const n = Number(v)
      if (!Number.isFinite(n) || n < 1 || n > 60) {
        return NextResponse.json({ error: '무료 보관일은 1~60일 범위여야 합니다.' }, { status: 400 })
      }
      patch.free_storage_days = Math.floor(n)
    }
  }

  if ('automatch_threshold' in body) {
    const v = body.automatch_threshold
    if (v === null) patch.automatch_threshold = null
    else {
      const n = Number(v)
      if (!Number.isFinite(n) || n < 70 || n > 95) {
        return NextResponse.json({ error: '자동 매칭 임계값은 70~95 범위여야 합니다.' }, { status: 400 })
      }
      patch.automatch_threshold = Math.floor(n)
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '변경할 항목이 없습니다.' }, { status: 400 })
  }

  const { error } = await sb
    .from('b2b_accounts')
    .update(patch)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, ...patch })
}
