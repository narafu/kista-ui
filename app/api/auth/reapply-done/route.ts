import { NextResponse } from 'next/server'
import { getAuthToken } from '@shared/lib/auth/token'
import { getApiBaseUrl } from '@shared/lib/env'
import { STATUS_COOKIE, CLEAR_COOKIE } from '@shared/lib/auth/cookies'
import { fetchUpstream, unauthorizedJson } from '@shared/lib/proxy/routeHelpers'

export async function POST() {
  const token = await getAuthToken()
  if (!token) {
    return unauthorizedJson()
  }

  try {
    const res = await fetchUpstream(`${getApiBaseUrl()}/api/auth/approval-requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }, 'reapply-done')

    if (!res.ok) {
      if (res.status >= 500) console.error(`[reapply-done] kista-api ${res.status}:`, await res.text().catch(() => ''))
      return NextResponse.json({ error: 'Reapply failed' }, { status: res.status })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(STATUS_COOKIE, '', CLEAR_COOKIE)
    return response
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
