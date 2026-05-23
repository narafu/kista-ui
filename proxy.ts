import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const STATUS_COOKIE = 'kista-user-status'
const ROLE_COOKIE = 'kista-user-role'
const KISTA_TOKEN_COOKIE = 'kista-token'
const VALID_STATUSES = new Set(['PENDING', 'REJECTED', 'ACTIVE'])
// status/role 캐시: 1시간마다 만료 → /me 재호출로 JWT 유효성 재검증
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 3600,
  path: '/',
}
const PROTECTED_PREFIXES = ['/dashboard', '/accounts', '/settings', '/statistics']
const ADMIN_PREFIXES = ['/admin']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next({ request: { headers: request.headers } })

  // API 라우트는 통과
  if (pathname.startsWith('/api/')) return response

  const token = request.cookies.get(KISTA_TOKEN_COOKIE)?.value

  if (!token) {
    const isProtected =
      PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) ||
      ADMIN_PREFIXES.some((p) => pathname.startsWith(p))
    if (isProtected) return redirectTo('/', request)
    return response
  }

  // 인증됨: status + role 캐시 확인
  const cachedStatus = request.cookies.get(STATUS_COOKIE)?.value
  const cachedRole = request.cookies.get(ROLE_COOKIE)?.value

  let status: string
  let role: string

  if (cachedStatus && VALID_STATUSES.has(cachedStatus) && cachedRole) {
    // 빠른 경로: 쿠키 캐시 사용
    status = cachedStatus
    role = cachedRole
  } else {
    // 느린 경로: kista-api /me 호출
    const isProtected =
      PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) ||
      ADMIN_PREFIXES.some((p) => pathname.startsWith(p))
    try {
      const apiUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL
      const meRes = await fetch(`${apiUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      })

      if (!meRes.ok) {
        const dest = isProtected ? redirectTo('/', request) : response
        // JWT 만료/무효 → 캐시 쿠키 초기화하여 다음 방문 시 재검증 강제
        dest.cookies.delete(STATUS_COOKIE)
        dest.cookies.delete(ROLE_COOKIE)
        return dest
      }

      const userData = await meRes.json()
      status = userData.status
      role = userData.role ?? 'USER'

      // PENDING은 캐싱 금지 — 승인 후 캐시 히트 버그 방지
      if (status !== 'PENDING') {
        response.cookies.set(STATUS_COOKIE, status, COOKIE_OPTIONS)
        response.cookies.set(ROLE_COOKIE, role, COOKIE_OPTIONS)
      }
    } catch {
      return isProtected ? redirectTo('/', request) : response
    }
  }

  return routeByStatusAndRole(status, role, pathname, request, response)
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
    if (pathname === '/' || pathname === '/pending' || pathname === '/rejected') {
      return redirectTo('/dashboard', request)
    }
    return response
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
