import { NextResponse } from 'next/server'

/**
 * Open-redirect 안전한 redirect.
 *
 * 사용처: 어필리에이트 outbound 링크. 공격자가 `/go?url=evil.com` 같은
 * 패턴으로 피싱 사이트로 리다이렉트하는 걸 방지.
 *
 * 권장 패턴: query string `url` 파라미터 받지 말고 path-bound 설계
 * (`/go/[provider]/[product_id]` → DB lookup → 검증된 URL 만 redirect).
 * 이 헬퍼는 그 검증 단계의 안전망.
 *
 * 메모리: affiliate_integration_plan.md (S4).
 */

export interface SafeRedirectOptions {
  /**
   * 허용된 외부 호스트 suffix. 예: ['amazon.com', 'rakuten.co.jp'].
   * 비우면 같은 origin (relative path) 만 허용.
   */
  allowedHosts?: string[]
  /**
   * relative path 를 절대 URL 로 변환할 기준 origin (NextResponse.redirect 는 절대 URL 필수).
   * 미지정 시 NEXT_PUBLIC_B2B_URL.
   */
  origin?: string
}

/**
 * 검증된 redirect Response 반환. 거절 시 400 JSON.
 */
export function safeRedirect(target: string, opts: SafeRedirectOptions = {}): NextResponse {
  // relative path: 같은 origin → 안전
  // `//host` (protocol-relative) 와 `/\host` (브라우저가 \ 를 / 로 취급) 는 외부 이탈이므로 제외
  if (target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\')) {
    const base =
      opts.origin ?? process.env.NEXT_PUBLIC_B2B_URL ?? 'https://seller.jimscanner.co.kr'
    return NextResponse.redirect(new URL(target, base))
  }

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return NextResponse.json({ error: 'invalid_redirect' }, { status: 400 })
  }

  // 스킴 검증
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return NextResponse.json(
      { error: 'redirect_disallowed_scheme', scheme: parsed.protocol },
      { status: 400 },
    )
  }

  // 호스트 allowlist
  const allowed = opts.allowedHosts ?? []
  const host = parsed.hostname.toLowerCase()
  const ok = allowed.some((a) => {
    const norm = a.toLowerCase().replace(/^\./, '')
    return host === norm || host.endsWith('.' + norm)
  })
  if (!ok) {
    return NextResponse.json(
      { error: 'redirect_host_not_allowed', host },
      { status: 400 },
    )
  }

  return NextResponse.redirect(parsed.toString())
}
