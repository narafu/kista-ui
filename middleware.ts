import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const STATUS_COOKIE = 'kista-user-status'
const VALID_STATUSES = new Set(['PENDING', 'REJECTED', 'ACTIVE'])
const STATUS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 604800,
  path: '/',
}

// 인증 필요 경로 prefix
const PROTECTED_PREFIXES = ['/dashboard', '/accounts', '/settings']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Supabase 세션 갱신 (토큰 refresh 처리)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // API 라우트는 세션 갱신만 하고 통과
  if (pathname.startsWith('/api/')) {
    return response
  }

  if (!user) {
    // 비인증: 보호 경로면 / 리다이렉트
    const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
    if (isProtected) {
      return redirectTo('/', request)
    }
    return response
  }

  // 인증됨: status 확인
  const cachedStatus = request.cookies.get(STATUS_COOKIE)?.value

  let status: string
  if (cachedStatus && VALID_STATUSES.has(cachedStatus)) {
    // 빠른 경로: 쿠키에서 status 읽기
    status = cachedStatus
  } else {
    // 느린 경로: kista-api 호출
    const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        return isProtected ? redirectTo('/', request) : response
      }

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

      // PENDING은 캐싱 금지 — 승인 후 새로고침 시 쿠키 캐시 히트로 PENDING 유지되는 버그 방지
      if (status !== 'PENDING') {
        response.cookies.set(STATUS_COOKIE, status, STATUS_COOKIE_OPTIONS)
      }
    } catch {
      return isProtected ? redirectTo('/', request) : response
    }
  }

  // status별 라우팅
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
    if (pathname !== '/pending') {
      return redirectTo('/pending', request)
    }
    return response
  }

  if (status === 'REJECTED') {
    if (pathname !== '/rejected') {
      return redirectTo('/rejected', request)
    }
    return response
  }

  if (status === 'ACTIVE') {
    // 비인증 전용 페이지에서 대시보드로
    if (
      pathname === '/' ||
      pathname === '/pending' ||
      pathname === '/rejected'
    ) {
      return redirectTo('/dashboard', request)
    }
    return response
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
