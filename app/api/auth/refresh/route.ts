import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { RT_COOKIE } from '@shared/lib/auth/cookies'
import { buildAtSetCookie, refreshAccessToken } from '@shared/lib/auth/refresh'

// 클라이언트 컴포넌트의 401 재시도용 — RT 쿠키로 AT 갱신 후 새 kista-token 쿠키 세팅
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const rt = cookieStore.get(RT_COOKIE)?.value
  if (!rt) return NextResponse.json({ error: 'No refresh token' }, { status: 401 })

  const refreshed = await refreshAccessToken({
    rt,
    userAgent: request.headers.get('user-agent') ?? 'unknown',
  })
  if (!refreshed) return NextResponse.json({ error: 'Refresh failed' }, { status: 401 })

  const isSecure = request.headers.get('x-forwarded-proto') === 'https'
  const response = NextResponse.json({ ok: true })

  // AT + RT relay 를 모두 raw Set-Cookie 로 append.
  // ResponseCookies.set()을 섞지 않으므로 재직렬화 덮어쓰기 위험 없음(docs/agents/app.md 쿠키 quirk).
  response.headers.append('Set-Cookie', buildAtSetCookie(refreshed.accessToken, isSecure))
  for (const sc of refreshed.setCookieHeaders) {
    response.headers.append('Set-Cookie', sc)
  }

  return response
}
