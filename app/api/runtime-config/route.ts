import type { NextRequest } from 'next/server'
import { createProxyRoute } from '@shared/lib/proxy/createProxyRoute'

const { GET: proxyGet } = createProxyRoute({
  basePath: '/api/runtime-config',
  requireAuth: false,
})

export async function GET(request: NextRequest) {
  const response = await proxyGet(request)
  response.headers.set('Cache-Control', 'no-store')
  return response
}
