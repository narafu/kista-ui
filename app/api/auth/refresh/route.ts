import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getApiBaseUrlOrNull } from '@shared/lib/env'
import { RT_COOKIE, KISTA_TOKEN_COOKIE } from '@shared/lib/auth/cookies'

// 클라이언트 컴포넌트의 401 재시도용 — RT 쿠키로 AT 갱신 후 새 kista-token 쿠키 세팅
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const rt = cookieStore.get(RT_COOKIE)?.value
  if (!rt) return NextResponse.json({ error: 'No refresh token' }, { status: 401 })

  const apiUrl = getApiBaseUrlOrNull()
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

    const data = await res.json() as { accessToken?: string }
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

    // RT 쿠키: kista-api Set-Cookie 헤더를 그대로 relay (Node.js 런타임에서 getSetCookie() 동작)
    const h = res.headers as Headers & { getSetCookie?: () => string[] }
    for (const sc of (typeof h.getSetCookie === 'function' ? h.getSetCookie() : [])) {
      response.headers.append('Set-Cookie', sc)
    }

    return response
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
