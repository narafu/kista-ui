import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const STATUS_COOKIE = 'kista-user-status'
const KISTA_TOKEN_COOKIE = 'kista-token'
const VALID_STATUSES = new Set(['PENDING', 'REJECTED', 'ACTIVE'])
const STATUS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 604800,
  path: '/',
}
const PROTECTED_PREFIXES = ['/dashboard', '/accounts', '/settings']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request: { headers: request.headers } })

  // API 라우트는 통과
  if (pathname.startsWith('/api/')) return response

  const token = request.cookies.get(KISTA_TOKEN_COOKIE)?.value

  if (!token) {
    const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
    if (isProtected) return redirectTo('/', request)
    return response
  }

  // 인증됨: status 캐시 확인
  const cachedStatus = request.cookies.get(STATUS_COOKIE)?.value

  let status: string
  if (cachedStatus && VALID_STATUSES.has(cachedStatus)) {
    // 빠른 경로: 쿠키 캐시 사용
    status = cachedStatus
  } else {
    // 느린 경로: kista-api /me 호출
    const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL
      const meRes = await fetch(`${apiUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      })

      if (!meRes.ok) {
        return isProtected ? redirectTo('/', request) : response
      }

      const userData = await meRes.json()
      status = userData.status

      // PENDING은 캐싱 금지 — 승인 후 캐시 히트 버그 방지
      if (status !== 'PENDING') {
        response.cookies.set(STATUS_COOKIE, status, STATUS_COOKIE_OPTIONS)
      }
    } catch {
      return isProtected ? redirectTo('/', request) : response
    }
  }

  return routeByStatus(status, pathname, request, response)
}

function redirectTo(pathname: string, request: NextRequest): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  return NextResponse.redirect(url)
}

function routeByStatus(
  status: string,
  pathname: string,
  request: NextRequest,
  response: NextResponse
): NextResponse {
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
