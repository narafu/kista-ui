import { getAuthToken } from '@shared/lib/auth/token'
import { getApiBaseUrl } from '@shared/lib/env'
import { fetchUpstream, noContent, relayUpstreamError, unauthorizedJson } from '@shared/lib/proxy/routeHelpers'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const authToken = await getAuthToken()
  if (!authToken) return unauthorizedJson()

  const { token } = await params

  const res = await fetchUpstream(`${getApiBaseUrl()}/api/fcm/tokens/${encodeURIComponent(token)}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${authToken}` },
    cache: 'no-store',
  }, 'fcm/tokens DELETE')

  if (!res.ok) return relayUpstreamError(res, 'fcm/tokens DELETE', 'DELETE')
  return noContent()
}
