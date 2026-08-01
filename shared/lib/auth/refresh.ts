import { getApiBaseUrlOrNull } from '@shared/lib/env'
import { KISTA_TOKEN_COOKIE, RT_COOKIE } from '@shared/lib/auth/cookies'

// proxy.ts(tryRefresh)와 app/api/auth/refresh/route.ts의 공통부.
// RT 쿠키로 kista-api /api/auth/refresh 를 호출해 새 AT + kista-api Set-Cookie(RT relay)를 얻는다.
// kista-api는 안정 RT + 슬라이딩 갱신 방식: RT 회전 없음 → 동일 RT를 갱신된 maxAge로 돌려줌(드리프트 원천 불가).
// Node.js 런타임에서 실행되므로 getSetCookie() 정상 동작(proxy.ts는 Next.js 16 Proxy 파일로 항상 Node runtime).
export interface RefreshResult {
  accessToken: string
  setCookieHeaders: string[]
}

export async function refreshAccessToken(opts: {
  rt: string
  userAgent: string
  timeoutMs?: number // proxy는 5000, route는 미지정
}): Promise<RefreshResult | null> {
  const apiUrl = getApiBaseUrlOrNull()
  if (!apiUrl) return null
  try {
    const res = await fetch(`${apiUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `${RT_COOKIE}=${opts.rt}`,
        'User-Agent': opts.userAgent,
      },
      cache: 'no-store',
      signal: opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : undefined,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { accessToken?: string }
    if (!data.accessToken) return null
    const h = res.headers as Headers & { getSetCookie?: () => string[] }
    const setCookieHeaders = typeof h.getSetCookie === 'function' ? h.getSetCookie() : []
    return { accessToken: data.accessToken, setCookieHeaders }
  } catch {
    return null
  }
}

// AT(kista-token) Set-Cookie 문자열을 생성한다. proxy.ts와 refresh/route.ts가 동일 값을 쓰도록 통일.
// 값: Path=/, Max-Age=604800(7일, JWT TTL과 동일), SameSite=Lax, HttpOnly, (프로토콜이 https일 때만) Secure.
// secure는 NODE_ENV가 아닌 실제 프로토콜(x-forwarded-proto) 기준 — Safari가 HTTP의 Secure 쿠키를 무시하기 때문.
export function buildAtSetCookie(token: string, isSecure: boolean): string {
  return `${KISTA_TOKEN_COOKIE}=${token}; Path=/; Max-Age=604800; SameSite=Lax; HttpOnly${isSecure ? '; Secure' : ''}`
}
