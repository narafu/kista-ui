import { NextResponse } from 'next/server'

const STATUS_COOKIE = 'kista-user-status'
const KISTA_TOKEN_COOKIE = 'kista-token'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(KISTA_TOKEN_COOKIE, '', { maxAge: 0, path: '/' })
  response.cookies.set(STATUS_COOKIE, '', { maxAge: 0, path: '/' })
  return response
}
