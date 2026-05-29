import { NextResponse } from 'next/server'
import { getAuthToken } from '@/lib/auth/token'

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const authToken = await getAuthToken()
  if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await params

  const res = await fetch(`${API_BASE_URL}/api/fcm/tokens/${encodeURIComponent(token)}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${authToken}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    console.error('[fcm/tokens DELETE] kista-api 실패:', res.status, errBody)
    return NextResponse.json({ error: 'Failed' }, { status: res.status })
  }
  return new NextResponse(null, { status: 204 })
}
