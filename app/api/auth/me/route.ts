import { NextResponse } from 'next/server'
import { getAuthToken } from '@lib/auth/token'

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL
const TOKEN_COOKIE = 'kista-token'
const STATUS_COOKIE = 'kista-user-status'
const ROLE_COOKIE = 'kista-user-role'

export async function DELETE() {
  const token = await getAuthToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    console.error(`[DELETE /api/auth/me] ${res.status}`)
    return NextResponse.json({ error: 'Failed' }, { status: res.status })
  }

  // 탈퇴 성공 — 3개 인증 쿠키 삭제
  const response = new NextResponse(null, { status: 204 })
  response.cookies.set(TOKEN_COOKIE, '', { maxAge: 0, path: '/' })
  response.cookies.set(STATUS_COOKIE, '', { maxAge: 0, path: '/', httpOnly: true })
  response.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/', httpOnly: true })
  return response
}
