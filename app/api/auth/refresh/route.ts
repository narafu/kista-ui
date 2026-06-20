import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const RT_COOKIE = 'refresh_token'
const KISTA_TOKEN_COOKIE = 'kista-token'

// 클라이언트 컴포넌트의 401 재시도용 — RT 쿠키로 AT 갱신 후 새 kista-token 쿠키 세팅
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const rt = cookieStore.get(RT_COOKIE)?.value
  if (!rt) return NextResponse.json({ error: 'No refresh token' }, { status: 401 })

  const apiUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL
  if (!apiUrl) return NextResponse.json({ error: 'Server error' }, { status: 500 })

  try {
    const res = await fetch(`${apiUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Cookie': `${RT_COOKIE}=${rt}`,
        'User-Agent': request.headers.get('user-agent') ?? 'unknown',
      },
      cache: 'no-store',
    })

    if (!res.ok) return NextResponse.json({ error: 'Refresh failed' }, { status: 401 })

    const data = await res.json() as { accessToken?: string; rawRefreshToken?: string }
    if (!data.accessToken) return NextResponse.json({ error: 'No access token' }, { status: 401 })

    const isSecure = request.headers.get('x-forwarded-proto') === 'https'
    const response = NextResponse.json({ ok: true })

    response.cookies.set(KISTA_TOKEN_COOKIE, data.accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 604800,
      path: '/',
    })

    // 새 RT 쿠키 브라우저에 전달 — JSON body rawRefreshToken 우선, 폴백은 Set-Cookie 헤더(Node.js에서는 forEach 동작)
    if (data.rawRefreshToken) {
      response.cookies.set(RT_COOKIE, data.rawRefreshToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        maxAge: 432000,
        path: '/',
      })
    } else {
      const h = res.headers as Headers & { getSetCookie?: () => string[] }
      for (const sc of (typeof h.getSetCookie === 'function' ? h.getSetCookie() : [])) {
        response.headers.append('Set-Cookie', sc)
      }
    }

    return response
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
