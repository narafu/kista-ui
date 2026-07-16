import { createProxyRoute } from '@shared/lib/proxy/createProxyRoute'
import type { NextRequest } from 'next/server'

type RouteContext = { params?: Promise<{ path?: string[] }> }

const proxy = createProxyRoute({
  basePath: '/api/admin',
})

async function settingsNoStore(
  handler: typeof proxy.GET,
  request: NextRequest,
  context?: RouteContext,
) {
  const response = await handler(request, context)
  const path = context?.params ? (await context.params).path : undefined
  if (path?.[0] === 'settings') response.headers.set('Cache-Control', 'no-store')
  return response
}

export const GET = (request: NextRequest, context?: RouteContext) => settingsNoStore(proxy.GET, request, context)
export const PUT = (request: NextRequest, context?: RouteContext) => settingsNoStore(proxy.PUT, request, context)
export const { POST, PATCH, DELETE } = proxy
