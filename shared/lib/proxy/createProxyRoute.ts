import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAuthToken } from '@shared/lib/auth/token'
import { getApiBaseUrl, getTradingApiBaseUrl } from '@shared/lib/env'
import { noContent, relayUpstreamError, unauthorizedJson } from '@shared/lib/proxy/routeHelpers'

type Params = { params?: Promise<{ path?: string[] }> }
type Handler = (req: NextRequest, ctx?: Params) => Promise<NextResponse>

type CreateProxyRouteOptions = {
  basePath: string
  // true(기본)이면 토큰 없을 때 401. false면 토큰이 있어도 Bearer 없이 비인증으로 전달 (GET /api/market/** 등 공개 엔드포인트용)
  // — kista-api JwtAuthFilter는 permitAll 경로에서도 무효 토큰(만료·블랙리스트·stale role)에 401을 줘, 붙이면 비회원이 clientFetch 로그아웃을 맞는다
  requireAuth?: boolean
  // 'api'(기본, 8080) | 'trading'(8081, kista-trading 분리 프로세스). 서브패스별로 소유 프로세스가 갈리면 함수로 분기(예: /api/stats/housing-benchmark만 'api')
  target?: 'api' | 'trading' | ((pathSegments: string[]) => 'api' | 'trading')
}

export function createProxyRoute(opts: CreateProxyRouteOptions): {
  GET: Handler
  POST: Handler
  PUT: Handler
  PATCH: Handler
  DELETE: Handler
} {
  const label = opts.basePath.replace(/^\/api\//, '')

  async function proxy(request: NextRequest, pathSegments: string[]) {
    // 공개 라우트는 쿠키 토큰을 읽지도 붙이지도 않는다 (위 requireAuth 주석 참고)
    const token = opts.requireAuth === false ? undefined : await getAuthToken()
    if (!token && opts.requireAuth !== false) return unauthorizedJson()

    const subPath = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : ''
    const resolvedTarget = typeof opts.target === 'function' ? opts.target(pathSegments) : opts.target
    const baseUrl = resolvedTarget === 'trading' ? getTradingApiBaseUrl() : getApiBaseUrl()
    const url = `${baseUrl}${opts.basePath}${subPath}${request.nextUrl.search}`
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
    let body: BodyInit | undefined

    if (request.method !== 'GET' && request.method !== 'DELETE') {
      const ct = request.headers.get('content-type')
      if (ct) headers['Content-Type'] = ct
      const text = await request.text()
      if (text) body = text
    }

    const res = await fetch(url, {
      method: request.method,
      headers,
      body,
      signal: request.signal,
      cache: 'no-store',
    })

    if (!res.ok) return relayUpstreamError(res, `${label}${subPath} ${request.method}`)

    if (res.status === 204) return noContent()
    return NextResponse.json(await res.json(), { status: res.status })
  }

  const handler: Handler = async (req, ctx) => {
    const pathSegments = ctx?.params ? (await ctx.params).path ?? [] : []
    return proxy(req, pathSegments)
  }

  return { GET: handler, POST: handler, PUT: handler, PATCH: handler, DELETE: handler }
}
