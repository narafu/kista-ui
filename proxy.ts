import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const STATUS_COOKIE = 'kista-user-status'
const ROLE_COOKIE = 'kista-user-role'
const KISTA_TOKEN_COOKIE = 'kista-token'
const RT_COOKIE = 'refresh_token'
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

// JWT exp 클레임만 확인 (서명 검증 없음) — bufferSecs 이내 만료도 갱신 대상
function isJwtExpired(token: string, bufferSecs = 30): boolean {
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

// RT 쿠키로 kista-api /api/auth/refresh 호출 — 성공 시 새 AT + Set-Cookie 헤더 반환
async function tryRefresh(
  request: NextRequest
): Promise<{ accessToken: string; setCookieHeaders: string[] } | null> {
  const rt = request.cookies.get(RT_COOKIE)?.value
  if (!rt) return null
  const apiUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL
  if (!apiUrl) return null
  try {
    const res = await fetch(`${apiUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Cookie': `${RT_COOKIE}=${rt}`,
        'User-Agent': request.headers.get('user-agent') ?? 'unknown',
      },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json() as { accessToken?: string; rawRefreshToken?: string }
    if (!data.accessToken) return null
    // Edge Runtime에서 Set-Cookie 헤더는 WHATWG fetch spec 레벨에서 필터링됨 (getSetCookie()도 동작 안 함)
    // → rawRefreshToken을 JSON body에서 직접 읽어 RT 쿠키 직접 구성
    const isSecure = request.headers.get('x-forwarded-proto') === 'https'
    const setCookieHeaders: string[] = []
    if (data.rawRefreshToken) {
      // URL-safe Base64만 허용 — cookie 속성 injection 방어
      if (!/^[A-Za-z0-9_-]+$/.test(data.rawRefreshToken)) return null
      setCookieHeaders.push(
        `${RT_COOKIE}=${data.rawRefreshToken}; Path=/; Max-Age=432000; HttpOnly; SameSite=Lax${isSecure ? '; Secure' : ''}`
      )
    } else {
      // 폴백: getSetCookie() 또는 forEach() 시도 (rawRefreshToken 미지원 백엔드 호환)
      const h = res.headers as Headers & { getSetCookie?: () => string[] }
      if (typeof h.getSetCookie === 'function') {
        setCookieHeaders.push(...h.getSetCookie())
      } else {
        res.headers.forEach((v, n) => { if (n.toLowerCase() === 'set-cookie') setCookieHeaders.push(v) })
      }
    }
    return { accessToken: data.accessToken, setCookieHeaders }
  } catch {
    return null
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
    if (isProtected) return redirectTo('/', request)
    return NextResponse.next({ request: { headers: request.headers } })
  }

  // AT 갱신 시 브라우저에 전달할 Set-Cookie 목록
  const extraSetCookies: string[] = []
  // 요청 헤더 (AT 갱신 시 Server Component가 읽는 kista-token 쿠키를 교체)
  let requestHeaders = new Headers(request.headers)

  // prefetch 요청은 인증 상태를 변형하지 않음 — AT 갱신 스킵
  // Next.js <Link> prefetch가 동시에 여러 refresh를 유발해 RTR 경쟁을 일으키는 것을 방지
  const isPrefetch =
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch'
  if (isPrefetch) return NextResponse.next({ request: { headers: requestHeaders } })

  // AT 만료 감지 → RT로 자동 갱신
  if (isJwtExpired(token)) {
    const refreshed = await tryRefresh(request)
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
      // 브라우저 AT 쿠키 업데이트 — HttpOnly로 XSS 방어 (app/api/auth/refresh/route.ts와 일치)
      const isSecure = request.headers.get('x-forwarded-proto') === 'https'
      extraSetCookies.push(
        `${KISTA_TOKEN_COOKIE}=${token}; Path=/; Max-Age=604800; SameSite=Lax; HttpOnly${isSecure ? '; Secure' : ''}`
      )
      // 새 RT 쿠키 전달 (kista-api Set-Cookie 헤더 그대로)
      for (const sc of refreshed.setCookieHeaders) extraSetCookies.push(sc)
    } else {
      // RT 없거나 갱신 실패 → 상태 캐시 삭제 후 보호 경로면 로그인 이동
      const dest = isProtected
        ? redirectTo('/', request)
        : NextResponse.next({ request: { headers: requestHeaders } })
      dest.cookies.delete(STATUS_COOKIE)
      dest.cookies.delete(ROLE_COOKIE)
      return dest
    }
  }

  // 인증됨: status + role 캐시 확인
  const cachedStatus = request.cookies.get(STATUS_COOKIE)?.value
  const cachedRole = request.cookies.get(ROLE_COOKIE)?.value

  let status: string
  let role: string
  let needsCacheUpdate = false

  if (cachedStatus && VALID_STATUSES.has(cachedStatus) && cachedRole) {
    // 빠른 경로: 쿠키 캐시 사용
    status = cachedStatus
    role = cachedRole
  } else {
    // 느린 경로: kista-api /me 호출
    needsCacheUpdate = true
    try {
      const apiUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL
      const meRes = await fetch(`${apiUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      })

      if (!meRes.ok) {
        const dest = isProtected
          ? redirectTo('/', request)
          : NextResponse.next({ request: { headers: requestHeaders } })
        // JWT 만료/무효 → 캐시 쿠키 초기화하여 다음 방문 시 재검증 강제
        dest.cookies.delete(STATUS_COOKIE)
        dest.cookies.delete(ROLE_COOKIE)
        // AT 갱신이 선행된 경우 새 AT·RT 쿠키를 반드시 적용 (미적용 시 RT rotation 후
        // 브라우저가 구 RT를 유지 → 다음 갱신에서 RTR reuse attack 탐지 → 전체 세션 폐기)
        for (const sc of extraSetCookies) dest.headers.append('Set-Cookie', sc)
        return dest
      }

      const userData = await meRes.json() as { status: string; role?: string }
      status = userData.status
      role = userData.role ?? 'USER'
    } catch {
      const dest = isProtected
        ? redirectTo('/', request)
        : NextResponse.next({ request: { headers: requestHeaders } })
      for (const sc of extraSetCookies) dest.headers.append('Set-Cookie', sc)
      return dest
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  // PENDING은 캐싱 금지 — 승인 후 캐시 히트 버그 방지
  if (needsCacheUpdate && status !== 'PENDING') {
    response.cookies.set(STATUS_COOKIE, status, COOKIE_OPTIONS)
    response.cookies.set(ROLE_COOKIE, role, COOKIE_OPTIONS)
  }

  const finalResponse = routeByStatusAndRole(status, role, pathname, request, response)

  // AT 갱신 쿠키를 최종 응답(리다이렉트 포함)에 항상 적용
  for (const sc of extraSetCookies) finalResponse.headers.append('Set-Cookie', sc)

  return finalResponse
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
