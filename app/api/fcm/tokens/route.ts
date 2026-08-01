import type { NextRequest } from 'next/server'
import { getApiBaseUrl } from '@shared/lib/env'
import { noContent, relayUpstreamError, requireAuthToken, unauthorizedJson } from '@shared/lib/proxy/routeHelpers'

export async function POST(request: NextRequest) {
  const token = await requireAuthToken()
  if (!token) return unauthorizedJson()

  const body = await request.json()
  const res = await fetch(`${getApiBaseUrl()}/api/fcm/tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!res.ok) return relayUpstreamError(res, 'fcm/tokens POST')
  return noContent()
}
