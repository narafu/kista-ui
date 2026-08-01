import { getApiBaseUrl } from '@shared/lib/env'
import { noContent, relayUpstreamError, requireAuthToken, unauthorizedJson } from '@shared/lib/proxy/routeHelpers'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const authToken = await requireAuthToken()
  if (!authToken) return unauthorizedJson()

  const { token } = await params

  const res = await fetch(`${getApiBaseUrl()}/api/fcm/tokens/${encodeURIComponent(token)}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${authToken}` },
    cache: 'no-store',
  })

  if (!res.ok) return relayUpstreamError(res, 'fcm/tokens DELETE')
  return noContent()
}
