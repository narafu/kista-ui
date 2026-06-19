import { NextResponse } from 'next/server'

const KISTA_TOKEN_COOKIE = 'kista-token'
const STATUS_COOKIE = 'kista-user-status'
const ROLE_COOKIE = 'kista-user-role'
const RT_COOKIE = 'refresh_token'

export async function POST() {
  const response = NextResponse.json({ success: true })
  const clear = { maxAge: 0, path: '/' }
  response.cookies.set(KISTA_TOKEN_COOKIE, '', clear)
  response.cookies.set(STATUS_COOKIE, '', clear)
  response.cookies.set(ROLE_COOKIE, '', clear)
  response.cookies.set(RT_COOKIE, '', clear)
  return response
}
