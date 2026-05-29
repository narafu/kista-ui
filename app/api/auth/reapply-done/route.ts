import { NextResponse } from 'next/server'
import { getAuthToken } from '@/lib/auth/token'

const STATUS_COOKIE = 'kista-user-status'

export async function POST() {
  const token = await getAuthToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL
  try {
    const res = await fetch(`${apiUrl}/api/auth/approval-requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[reapply-done] kista-api ${res.status}: ${body}`)
      return NextResponse.json({ error: 'Reapply failed' }, { status: res.status })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(STATUS_COOKIE, '', { maxAge: 0, path: '/' })
    return response
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
