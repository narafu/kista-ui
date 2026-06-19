import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const KISTA_TOKEN_COOKIE = 'kista-token'
const STATUS_COOKIE = 'kista-user-status'
const ROLE_COOKIE = 'kista-user-role'
const RT_COOKIE = 'refresh_token'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const rt = cookieStore.get(RT_COOKIE)?.value
  const apiUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL

  // 백엔드 logout — RT DB 삭제 + AT 블랙리스트 등재 (실패해도 클라이언트 쿠키는 삭제)
  if (rt && apiUrl) {
    await fetch(`${apiUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Cookie': `${RT_COOKIE}=${rt}`,
        'User-Agent': request.headers.get('user-agent') ?? 'unknown',
      },
      cache: 'no-store',
    }).catch(() => {})
  }

  const response = NextResponse.json({ success: true })
  const clear = { maxAge: 0, path: '/' }
  response.cookies.set(KISTA_TOKEN_COOKIE, '', clear)
  response.cookies.set(STATUS_COOKIE, '', clear)
  response.cookies.set(ROLE_COOKIE, '', clear)
  response.cookies.set(RT_COOKIE, '', clear)
  return response
}
