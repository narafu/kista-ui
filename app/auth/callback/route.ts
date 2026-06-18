import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const STATUS_COOKIE = 'kista-user-status'
const KISTA_TOKEN_COOKIE = 'kista-token'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const host = request.headers.get('host') ?? 'localhost:3000'
  const proto = request.headers.get('x-forwarded-proto') ?? 'http'
  const TOKEN_COOKIE_OPTIONS = {
    httpOnly: false,   // 클라이언트 컴포넌트가 document.cookie로 읽어야 하므로 false
    secure: proto === 'https',  // 실제 프로토콜 기반 — HTTP(로컬)에서도 Safari가 쿠키 수락
    sameSite: 'lax' as const,
    maxAge: 604800,    // 7일 — JWT TTL과 동일
    path: '/',
  }
  const origin = `${proto}://${host}`
  const code = searchParams.get('code')

  if (!code) {
    const error = searchParams.get('error') ?? 'none'
    console.error(`[auth/callback] no code. error=${error}`)
    return NextResponse.redirect(
      new URL(`/?error=no_code&detail=${encodeURIComponent(error)}`, origin)
    )
  }

  const apiUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL
  if (!apiUrl) {
    console.error('[auth/callback] NEXT_PUBLIC_API_BASE_URL 미설정')
    return NextResponse.redirect(new URL('/?error=server_error', origin))
  }

  const redirectUri = `${origin}/auth/callback`

  try {
    const res = await fetch(`${apiUrl}/api/auth/kakao/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': request.headers.get('user-agent') ?? 'unknown',
      },
      body: JSON.stringify({ code, redirectUri }),
      cache: 'no-store',
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[auth/callback] kista-api 실패: HTTP ${res.status}`, body)
      return NextResponse.redirect(new URL('/?error=auth_failed', origin))
    }

    const data = await res.json()
    const { accessToken, user } = data
    const status: string = user.status

    const response = NextResponse.redirect(
      new URL(getRedirectPath(status), origin)
    )

    // kista-token: httpOnly: false (클라이언트 JS 접근 필요)
    response.cookies.set(KISTA_TOKEN_COOKIE, accessToken, TOKEN_COOKIE_OPTIONS)

    // kista-user-status: PENDING 제외하고 캐싱
    if (status !== 'PENDING') {
      response.cookies.set(STATUS_COOKIE, status, {
        ...TOKEN_COOKIE_OPTIONS,
        httpOnly: true,  // status 쿠키는 서버 전용으로 보호
      })
    }

    return response
  } catch (e) {
    console.error('[auth/callback] 예외:', e)
    return NextResponse.redirect(new URL('/?error=server_error', origin))
  }
}

function getRedirectPath(status: string): string {
  switch (status) {
    case 'ACTIVE': return '/dashboard'
    case 'PENDING': return '/pending'
    case 'REJECTED': return '/rejected'
    default: return '/'
  }
}
