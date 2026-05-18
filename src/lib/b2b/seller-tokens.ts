/**
 * 브라우저 확장용 long-lived API 토큰.
 *
 * - 발급: 32바이트 랜덤 → "jsx_" 프리픽스 붙여 raw 반환 (1회만 노출).
 * - 저장: sha256(raw) hex 만 저장. token_prefix 는 사용자 식별용 앞 8자.
 * - 검증: 헤더 Bearer 토큰 → sha256 → token_hash 매칭 → revoked_at 체크 → account_id 반환.
 */
import { createHash, randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export type SellerTokenAuth = {
  account_id: string
  token_id: string
}

/** 32바이트 base64url → "jsx_<43chars>" 형식 (총 47자). */
export function generateRawToken(): { raw: string; hash: string; prefix: string } {
  const buf = randomBytes(32)
  const body = buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const raw = `jsx_${body}`
  const hash = createHash('sha256').update(raw).digest('hex')
  const prefix = raw.slice(0, 12) // "jsx_" + 앞 8자
  return { raw, hash, prefix }
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

/**
 * Authorization 헤더에서 Bearer 추출 후 검증.
 * 성공 시 account_id / token_id 반환, 실패 시 null.
 */
export async function authenticateSellerToken(
  request: Request,
): Promise<SellerTokenAuth | null> {
  const auth = request.headers.get('authorization') ?? request.headers.get('Authorization')
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) return null
  const raw = auth.slice(7).trim()
  if (!raw.startsWith('jsx_')) return null

  const hash = hashToken(raw)
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('b2b_seller_tokens')
    .select('id, account_id, revoked_at')
    .eq('token_hash', hash)
    .maybeSingle()

  if (!data || data.revoked_at) return null

  // last_used_at 갱신 (fire-and-forget)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(admin as any)
    .from('b2b_seller_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => undefined, () => undefined)

  return { account_id: data.account_id, token_id: data.id }
}
