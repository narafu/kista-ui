import { createProxyRoute } from '@shared/lib/proxy/createProxyRoute'
import type { NextRequest } from 'next/server'

type RouteContext = { params?: Promise<{ path?: string[] }> }

const proxy = createProxyRoute({
  basePath: '/api/admin',
})

// 관리자 응답은 전부 운영 판단용 가변 데이터 — 브라우저 HTTP 캐시에 남기지 않는다
function noStore(handler: typeof proxy.GET) {
  return async (request: NextRequest, context?: RouteContext) => {
    const response = await handler(request, context)
    response.headers.set('Cache-Control', 'no-store')
    return response
  }
}

export const GET = noStore(proxy.GET)
export const POST = noStore(proxy.POST)
export const PUT = noStore(proxy.PUT)
export const PATCH = noStore(proxy.PATCH)
export const DELETE = noStore(proxy.DELETE)
