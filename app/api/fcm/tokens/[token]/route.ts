import { NextResponse } from 'next/server'
import { getAuthToken } from '@shared/lib/auth/token'
import { getApiBaseUrl } from '@shared/lib/env'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const authToken = await getAuthToken()
  if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await params

  const res = await fetch(`${getApiBaseUrl()}/api/fcm/tokens/${encodeURIComponent(token)}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${authToken}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    if (res.status >= 500) console.error('[fcm/tokens DELETE] kista-api 실패:', res.status, await res.text().catch(() => ''))
    return NextResponse.json({ error: 'Failed' }, { status: res.status })
  }
  return new NextResponse(null, { status: 204 })
}
