import { getApiBaseUrlOrNull } from '@shared/lib/env'
import { KISTA_TOKEN_COOKIE, RT_COOKIE } from '@shared/lib/auth/cookies'

// proxy.ts(tryRefresh)와 app/api/auth/refresh/route.ts의 공통부.
// RT 쿠키로 kista-api /api/auth/refresh 를 호출해 새 AT + kista-api Set-Cookie(RT relay)를 얻는다.
// kista-api는 RT를 회전한다(RTR). 회전된 RT를 60초 grace 뒤에 다시 내면 그 사용자의 전체 세션이 폐기된다.
// Node.js 런타임에서 실행되므로 getSetCookie() 정상 동작(proxy.ts는 Next.js 16 Proxy 파일로 항상 Node runtime).
interface RefreshResult {
  accessToken: string
  setCookieHeaders: string[]
}

// 요청이 kista-api에 닿지 않아 RT가 회전되지 않은 것이 확실한 결과. null(거절)과 달리 세션을 유지하고 같은 RT로 다시 시도한다.
// timeout·연결 끊김·500은 회전이 커밋됐을 수 있어 여기 넣지 않는다 — 옛 RT를 계속 내면 전체 세션 폐기로 이어진다
export const REFRESH_UNAVAILABLE = 'UNAVAILABLE'
const NOT_REACHED_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH', 'UND_ERR_CONNECT_TIMEOUT'])

export async function refreshAccessToken(opts: {
  rt: string
  userAgent: string
  timeoutMs?: number // proxy는 5000, route는 미지정
}): Promise<RefreshResult | typeof REFRESH_UNAVAILABLE | null> {
  const apiUrl = getApiBaseUrlOrNull()
  if (!apiUrl) return REFRESH_UNAVAILABLE
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
    if (res.status === 503) return REFRESH_UNAVAILABLE
    if (!res.ok) return null
    const data = (await res.json()) as { accessToken?: string }
    if (!data.accessToken) return null
    const h = res.headers as Headers & { getSetCookie?: () => string[] }
    const setCookieHeaders = typeof h.getSetCookie === 'function' ? h.getSetCookie() : []
    return { accessToken: data.accessToken, setCookieHeaders }
  } catch (e) {
    const code = ((e as { cause?: { code?: unknown } }).cause)?.code
    return typeof code === 'string' && NOT_REACHED_CODES.has(code) ? REFRESH_UNAVAILABLE : null
  }
}

// AT(kista-token) Set-Cookie 문자열을 생성한다. proxy.ts와 refresh/route.ts가 동일 값을 쓰도록 통일.
// 값: Path=/, Max-Age=604800(7일, JWT TTL과 동일), SameSite=Lax, HttpOnly, (프로토콜이 https일 때만) Secure.
// secure는 NODE_ENV가 아닌 실제 프로토콜(x-forwarded-proto) 기준 — Safari가 HTTP의 Secure 쿠키를 무시하기 때문.
export function buildAtSetCookie(token: string, isSecure: boolean): string {
  return `${KISTA_TOKEN_COOKIE}=${token}; Path=/; Max-Age=604800; SameSite=Lax; HttpOnly${isSecure ? '; Secure' : ''}`
}
