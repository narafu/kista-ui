import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getAuthToken } from '@shared/lib/auth/token'
import { cacheTags } from '@shared/lib/cache/tags'

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL

export async function PATCH(request: NextRequest) {
  const token = await getAuthToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const res = await fetch(`${API_BASE_URL}/api/settings/balance-check`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!res.ok) {
    if (res.status >= 500) console.error('[settings/balance-check PATCH] kista-api 실패:', res.status, await res.text().catch(() => ''))
    return NextResponse.json({ error: 'Failed' }, { status: res.status })
  }
  revalidateTag(cacheTags.user(token), 'max')
  return new NextResponse(null, { status: 204 })
}
