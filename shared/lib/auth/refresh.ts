import { getApiBaseUrlOrNull } from '@shared/lib/env'
import { KISTA_TOKEN_COOKIE, RT_COOKIE } from '@shared/lib/auth/cookies'

// proxy.ts(tryRefresh)와 app/api/auth/refresh/route.ts의 공통부.
// RT 쿠키로 kista-api /api/auth/refresh 를 호출해 새 AT + kista-api Set-Cookie(RT relay)를 얻는다.
// kista-api는 RT를 회전한다(RTR). 회전된 RT를 다시 내도 회전 후 1일 안이고 후계가 미사용이면 같은 후계 RT를 200으로 돌려준다.
// 1일 초과·후계 없음은 이 기기만 401이다. 전체 세션 폐기는 후계를 이미 쓴 뒤 60초가 지나 옛 RT를 냈을 때만 일어난다.
// Node.js 런타임에서 실행되므로 getSetCookie() 정상 동작(proxy.ts는 Next.js 16 Proxy 파일로 항상 Node runtime).
interface RefreshResult {
  accessToken: string
  setCookieHeaders: string[]
}

// 갱신 결과를 알 수 없는 실패(5xx, timeout, 연결 실패·끊김, 응답 본문 유실, API URL 없음). null(거절)과 달리 세션을 유지하고
// 다음 요청에서 같은 RT로 다시 시도한다. 회전이 커밋된 뒤 응답만 잃었어도 1일 안의 재시도는 같은 후계를 받는다(재시도 안전).
// 이 재시도 안전성은 kista-api 3efb88645·1e9e55fd6 이후다 — 그 전 api에서는 60초 뒤 재시도가 전체 세션 폐기라 ui를 api 뒤에 배포한다.
// 4xx(408·429 제외)는 서버가 RT를 거절한 것이라 null(로그아웃)로 둔다. 요청 전에 나는 TypeError(쿠키 값에 0xFF 초과 문자 등)도
// 매번 반복되므로 null이다 — undici 네트워크 오류는 cause가 있고 이 오류는 없다.
// ponytail: 같은 RT에 api가 계속 5xx를 내면 자동 로그아웃 없이 재시작 안내가 남는다. proxy가 보호 경로를 /login으로 보내 재로그인으로 벗어난다.
// 실제로 겪으면 연속 UNAVAILABLE 횟수 상한을 둔다.
export const REFRESH_UNAVAILABLE = 'UNAVAILABLE'

export async function refreshAccessToken(opts: {
  rt: string
  userAgent: string
  timeoutMs?: number // proxy·route 모두 5000
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
    if (res.status >= 500 || res.status === 408 || res.status === 429) return REFRESH_UNAVAILABLE
    if (!res.ok) return null
    const data = (await res.json()) as { accessToken?: string }
    if (!data.accessToken) return null
    const h = res.headers as Headers & { getSetCookie?: () => string[] }
    const setCookieHeaders = typeof h.getSetCookie === 'function' ? h.getSetCookie() : []
    return { accessToken: data.accessToken, setCookieHeaders }
  } catch (e) {
    return e instanceof TypeError && e.cause === undefined ? null : REFRESH_UNAVAILABLE
  }
}

// AT(kista-token) Set-Cookie 문자열을 생성한다. proxy.ts와 refresh/route.ts가 동일 값을 쓰도록 통일.
// 값: Path=/, Max-Age=604800(7일, JWT TTL과 동일), SameSite=Lax, HttpOnly, (프로토콜이 https일 때만) Secure.
// secure는 NODE_ENV가 아닌 실제 프로토콜(x-forwarded-proto) 기준 — Safari가 HTTP의 Secure 쿠키를 무시하기 때문.
export function buildAtSetCookie(token: string, isSecure: boolean): string {
  return `${KISTA_TOKEN_COOKIE}=${token}; Path=/; Max-Age=604800; SameSite=Lax; HttpOnly${isSecure ? '; Secure' : ''}`
}
