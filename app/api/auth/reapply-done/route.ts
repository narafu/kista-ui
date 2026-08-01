import { NextResponse } from 'next/server'
import { getAuthToken } from '@shared/lib/auth/token'
import { getApiBaseUrl } from '@shared/lib/env'

const STATUS_COOKIE = 'kista-user-status'

export async function POST() {
  const token = await getAuthToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/auth/approval-requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      if (res.status >= 500) console.error(`[reapply-done] kista-api ${res.status}:`, await res.text().catch(() => ''))
      return NextResponse.json({ error: 'Reapply failed' }, { status: res.status })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(STATUS_COOKIE, '', { maxAge: 0, path: '/' })
    return response
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
