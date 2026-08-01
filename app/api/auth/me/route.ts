import { NextResponse } from 'next/server'
import { getApiBaseUrl } from '@shared/lib/env'
import {
  KISTA_TOKEN_COOKIE,
  STATUS_COOKIE,
  ROLE_COOKIE,
  CLEAR_COOKIE,
} from '@shared/lib/auth/cookies'
import { noContent, relayUpstreamError, requireAuthToken, unauthorizedJson } from '@shared/lib/proxy/routeHelpers'

export async function GET() {
  const token = await requireAuthToken()
  if (!token) return unauthorizedJson()

  const res = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!res.ok) return relayUpstreamError(res, 'auth/me GET')
  return NextResponse.json(await res.json())
}

export async function DELETE() {
  const token = await requireAuthToken()
  if (!token) return unauthorizedJson()

  const res = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!res.ok) return relayUpstreamError(res, 'auth/me DELETE')

  // 탈퇴 성공 — 3개 인증 쿠키 삭제
  const response = noContent()
  response.cookies.set(KISTA_TOKEN_COOKIE, '', CLEAR_COOKIE)
  response.cookies.set(STATUS_COOKIE, '', { ...CLEAR_COOKIE, httpOnly: true })
  response.cookies.set(ROLE_COOKIE, '', { ...CLEAR_COOKIE, httpOnly: true })
  return response
}
