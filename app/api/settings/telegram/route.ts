import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAuthToken } from '@/lib/auth/token'

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL

export async function PUT(request: NextRequest) {
  const token = await getAuthToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const res = await fetch(`${API_BASE_URL}/api/settings/telegram`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    console.error(`[settings/telegram PUT] kista-api 실패: ${res.status}`, errBody)
    return NextResponse.json({ error: 'Failed' }, { status: res.status })
  }
  return new NextResponse(null, { status: 204 })
}

export async function DELETE() {
  const token = await getAuthToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(`${API_BASE_URL}/api/settings/telegram`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    console.error(`[settings/telegram DELETE] kista-api 실패: ${res.status}`, errBody)
    return NextResponse.json({ error: 'Failed' }, { status: res.status })
  }
  return new NextResponse(null, { status: 204 })
}
