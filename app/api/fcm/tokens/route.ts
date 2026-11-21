import type { NextRequest } from 'next/server'
import { getAuthToken } from '@shared/lib/auth/token'
import { getApiBaseUrl } from '@shared/lib/env'
import { fetchUpstream, noContent, relayUpstreamError, unauthorizedJson } from '@shared/lib/proxy/routeHelpers'

export async function POST(request: NextRequest) {
  const token = await getAuthToken()
  if (!token) return unauthorizedJson()

  const body = await request.json()
  const res = await fetchUpstream(`${getApiBaseUrl()}/api/fcm/tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  }, 'fcm/tokens POST')

  if (!res.ok) return relayUpstreamError(res, 'fcm/tokens POST')
  return noContent()
}
