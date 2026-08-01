import { NextResponse } from 'next/server'
import { getAuthToken } from '@shared/lib/auth/token'
import { getApiBaseUrl } from '@shared/lib/env'
import {
  KISTA_TOKEN_COOKIE,
  STATUS_COOKIE,
  ROLE_COOKIE,
  CLEAR_COOKIE,
} from '@shared/lib/auth/cookies'

export async function GET() {
  const token = await getAuthToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!res.ok) return NextResponse.json({ error: 'Failed' }, { status: res.status })
  return NextResponse.json(await res.json())
}

export async function DELETE() {
  const token = await getAuthToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    if (res.status >= 500) console.error(`[DELETE /api/auth/me] ${res.status}`)
    return NextResponse.json({ error: 'Failed' }, { status: res.status })
  }

  // 탈퇴 성공 — 3개 인증 쿠키 삭제
  const response = new NextResponse(null, { status: 204 })
  response.cookies.set(KISTA_TOKEN_COOKIE, '', CLEAR_COOKIE)
  response.cookies.set(STATUS_COOKIE, '', { ...CLEAR_COOKIE, httpOnly: true })
  response.cookies.set(ROLE_COOKIE, '', { ...CLEAR_COOKIE, httpOnly: true })
  return response
}
