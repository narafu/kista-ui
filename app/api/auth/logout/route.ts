import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getApiBaseUrlOrNull } from '@shared/lib/env'
import {
  KISTA_TOKEN_COOKIE,
  STATUS_COOKIE,
  ROLE_COOKIE,
  RT_COOKIE,
  CLEAR_COOKIE,
} from '@shared/lib/auth/cookies'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const rt = cookieStore.get(RT_COOKIE)?.value
  const apiUrl = getApiBaseUrlOrNull()

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
  response.cookies.set(KISTA_TOKEN_COOKIE, '', CLEAR_COOKIE)
  response.cookies.set(STATUS_COOKIE, '', CLEAR_COOKIE)
  response.cookies.set(ROLE_COOKIE, '', CLEAR_COOKIE)
  response.cookies.set(RT_COOKIE, '', CLEAR_COOKIE)
  return response
}
