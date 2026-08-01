import { NextResponse } from 'next/server'
import { getAuthToken } from '@shared/lib/auth/token'
import { getApiBaseUrl } from '@shared/lib/env'

const TOKEN_COOKIE = 'kista-token'
const STATUS_COOKIE = 'kista-user-status'
const ROLE_COOKIE = 'kista-user-role'

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
  response.cookies.set(TOKEN_COOKIE, '', { maxAge: 0, path: '/' })
  response.cookies.set(STATUS_COOKIE, '', { maxAge: 0, path: '/', httpOnly: true })
  response.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/', httpOnly: true })
  return response
}
