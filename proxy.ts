import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getApiBaseUrlOrNull } from '@shared/lib/env'
import {
  STATUS_COOKIE,
  ROLE_COOKIE,
  KISTA_TOKEN_COOKIE,
  RT_COOKIE,
} from '@shared/lib/auth/cookies'
import { buildAtSetCookie, refreshAccessToken } from '@shared/lib/auth/refresh'
const VALID_STATUSES = new Set(['PENDING', 'REJECTED', 'ACTIVE'])
// status/role 캐시: 1시간마다 만료 → /me 재호출로 JWT 유효성 재검증
// secure는 NODE_ENV가 아닌 실제 프로토콜 기준 (docs/agents/app.md — Safari HTTP Secure 쿠키 무시)
const cacheCookieOptions = (request: NextRequest) => ({
  httpOnly: true,
  secure: request.headers.get('x-forwarded-proto') === 'https',
  sameSite: 'lax' as const,
  maxAge: 3600,
  path: '/',
})
const PROTECTED_PREFIXES = ['/dashboard', '/accounts', '/strategies', '/stats', '/settings']
const ADMIN_PREFIXES = ['/admin']

// JWT exp 클레임만 확인 (서명 검증 없음) — bufferSecs 이내 만료도 갱신 대상
export function isJwtExpired(token: string, bufferSecs = 30): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded)) as { exp?: number }
    return typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000) + bufferSecs
  } catch {
    return true
  }
}

// status/role 확정 결과: 성공(캐시 히트 or /me) 또는 실패(clearCache 여부만 전달)
// clearCache 비대칭: /me 비정상(!ok) → 캐시 삭제, /me 예외 → 삭제 안 함 (기존 동작 그대로 보존)
type ResolveResult =
  | { ok: true; status: string; role: string; needsCacheUpdate: boolean }
  | { ok: false; clearCache: boolean }

// 인증된 토큰의 status/role 확정: 쿠키 캐시 히트(fast path) 우선, 없으면 kista-api /me 호출(slow path)
async function resolveStatusRole(
  request: NextRequest,
  token: string,
  apiUrl: string | null,
): Promise<ResolveResult> {
  const cachedStatus = request.cookies.get(STATUS_COOKIE)?.value
  const cachedRole = request.cookies.get(ROLE_COOKIE)?.value

  if (cachedStatus && VALID_STATUSES.has(cachedStatus) && cachedRole) {
    // 빠른 경로: 쿠키 캐시 사용
    return { ok: true, status: cachedStatus, role: cachedRole, needsCacheUpdate: false }
  }

  // 느린 경로: kista-api /me 호출
  try {
    const meRes = await fetch(`${apiUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    })
    // JWT 만료/무효 → 캐시 쿠키 초기화하여 다음 방문 시 재검증 강제
    if (!meRes.ok) return { ok: false, clearCache: true }
    const userData = await meRes.json() as { status: string; role?: string }
    return { ok: true, status: userData.status, role: userData.role ?? 'USER', needsCacheUpdate: true }
  } catch {
    // 일시적 네트워크 오류(timeout/연결 실패)로 보고 캐시를 보존하는 원본 선택 — 재방문 시 다시 검증.
    // app.md가 요구하는 "JWT 무효 시 캐시 삭제"는 위 !ok(401) 경로(clearCache:true)가 담당한다.
    return { ok: false, clearCache: false }
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API 라우트는 통과
  if (pathname.startsWith('/api/')) return NextResponse.next({ request: { headers: request.headers } })

  const isProtected =
    PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) ||
    ADMIN_PREFIXES.some((p) => pathname.startsWith(p))

  let token = request.cookies.get(KISTA_TOKEN_COOKIE)?.value

  if (!token) {
    if (isProtected) return redirectTo('/login', request)
    // '/'는 비보호 경로로 유지 — (auth)/page.tsx가 인증 분기 후 리다이렉트 (감사 A-01·S-01)
    return NextResponse.next({ request: { headers: request.headers } })
  }

  // AT 갱신 시 브라우저에 전달할 Set-Cookie 목록
  const extraSetCookies: string[] = []
  // 요청 헤더 (AT 갱신 시 Server Component가 읽는 kista-token 쿠키를 교체)
  const requestHeaders = new Headers(request.headers)

  // 실패/통과 응답 공통 마무리: 리다이렉트/통과 응답에 캐시쿠키 삭제(옵션) + AT 갱신 Set-Cookie 적용
  const finalize = (dest: NextResponse, opts: { clearCache?: boolean } = {}): NextResponse => {
    if (opts.clearCache) {
      dest.cookies.delete(STATUS_COOKIE)
      dest.cookies.delete(ROLE_COOKIE)
    }
    for (const sc of extraSetCookies) dest.headers.append('Set-Cookie', sc)
    return dest
  }
  const failDest = (): NextResponse =>
    isProtected
      ? redirectTo('/login', request)
      : NextResponse.next({ request: { headers: requestHeaders } })

  // prefetch 요청은 인증 상태를 변형하지 않음 — AT 갱신 스킵
  // Next.js <Link> prefetch가 동시에 여러 refresh를 유발해 RTR 경쟁을 일으키는 것을 방지
  const isPrefetch =
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch'
  if (isPrefetch) return NextResponse.next({ request: { headers: requestHeaders } })

  // AT 만료 감지 → RT로 자동 갱신 (안정 RT 방식: kista-api가 동일 RT를 갱신된 maxAge로 돌려줌 — 드리프트 없음)
  if (isJwtExpired(token)) {
    const rt = request.cookies.get(RT_COOKIE)?.value
    const refreshed = rt
      ? await refreshAccessToken({
          rt,
          userAgent: request.headers.get('user-agent') ?? 'unknown',
          timeoutMs: 5000,
        })
      : null
    if (refreshed) {
      token = refreshed.accessToken
      // 요청 쿠키 헤더에 새 AT 반영 — Server Component의 getAuthToken()이 읽음
      const rawCookie = requestHeaders.get('cookie') ?? ''
      const updatedCookie = rawCookie
        .split('; ')
        .filter((c) => c.length > 0 && !c.trim().startsWith(`${KISTA_TOKEN_COOKIE}=`))
        .concat(`${KISTA_TOKEN_COOKIE}=${token}`)
        .join('; ')
      requestHeaders.set('cookie', updatedCookie)
      // 브라우저 AT 쿠키 업데이트 — HttpOnly로 XSS 방어 (app/api/auth/refresh/route.ts와 동일 값)
      const isSecure = request.headers.get('x-forwarded-proto') === 'https'
      extraSetCookies.push(buildAtSetCookie(token, isSecure))
      // RT Set-Cookie relay: 동일 RT + 갱신된 maxAge(슬라이딩) — 브라우저 쿠키 수명 연장
      for (const sc of refreshed.setCookieHeaders) extraSetCookies.push(sc)
    } else {
      // RT 없거나 갱신 실패 → 상태 캐시 삭제 후 보호 경로면 로그인 이동
      return finalize(failDest(), { clearCache: true })
    }
  }

  // 인증됨: status + role 확정 (캐시 fast path / /me slow path)
  const apiUrl = getApiBaseUrlOrNull()
  const resolved = await resolveStatusRole(request, token, apiUrl)

  if (!resolved.ok) {
    // AT 갱신이 선행된 경우 새 AT 쿠키를 반드시 적용 (RT는 안정 RT이므로 drift 없음)
    return finalize(failDest(), { clearCache: resolved.clearCache })
  }

  const { status, role, needsCacheUpdate } = resolved
  const response = NextResponse.next({ request: { headers: requestHeaders } })

  // PENDING은 캐싱 금지 — 승인 후 캐시 히트 버그 방지
  if (needsCacheUpdate && status !== 'PENDING') {
    const opts = cacheCookieOptions(request)
    response.cookies.set(STATUS_COOKIE, status, opts)
    response.cookies.set(ROLE_COOKIE, role, opts)
  }

  // 캐시쿠키 set은 리다이렉트 전 response에 적용해야 함 → finalize는 AT 갱신 쿠키만 최종 응답에 부착
  const finalResponse = routeByStatusAndRole(status, role, pathname, request, response)
  return finalize(finalResponse)
}

function redirectTo(pathname: string, request: NextRequest): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  return NextResponse.redirect(url)
}

function routeByStatusAndRole(
  status: string,
  role: string,
  pathname: string,
  request: NextRequest,
  response: NextResponse
): NextResponse {
  // /admin/** — ADMIN만 접근
  if (ADMIN_PREFIXES.some((p) => pathname.startsWith(p))) {
    return role === 'ADMIN' ? response : redirectTo('/dashboard', request)
  }

  if (status === 'PENDING') {
    if (pathname !== '/pending') return redirectTo('/pending', request)
    return response
  }
  if (status === 'REJECTED') {
    if (pathname !== '/rejected') return redirectTo('/rejected', request)
    return response
  }
  if (status === 'ACTIVE') {
    if (pathname === '/' || pathname === '/login' || pathname === '/pending' || pathname === '/rejected') {
      return redirectTo('/dashboard', request)
    }
    return response
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
