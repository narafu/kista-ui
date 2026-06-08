import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getAuthToken } from '@shared/lib/auth/token'

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL

type Params = { params: Promise<{ path?: string[] }> }
type Handler = (req: NextRequest, ctx: Params) => Promise<NextResponse>

export type CreateProxyRouteOptions = {
  basePath: string
  revalidateTags?: (token: string) => string[]
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
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const subPath = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : ''
    const url = `${API_BASE_URL}${opts.basePath}${subPath}${request.nextUrl.search}`
    const headers: HeadersInit = { Authorization: `Bearer ${token}` }
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

    if (!res.ok) {
      if (res.status >= 500) {
        console.error(
          `[${label}${subPath} ${request.method}] ${res.status}`,
          await res.text().catch(() => ''),
        )
      }
      return NextResponse.json({ error: 'Failed' }, { status: res.status })
    }

    if (request.method !== 'GET' && opts.revalidateTags) {
      for (const tag of opts.revalidateTags(token)) revalidateTag(tag, 'max')
    }

    if (res.status === 204) return new NextResponse(null, { status: 204 })
    return NextResponse.json(await res.json(), { status: res.status })
  }

  const handler: Handler = async (req, { params }) =>
    proxy(req, (await params).path ?? [])

  return { GET: handler, POST: handler, PUT: handler, PATCH: handler, DELETE: handler }
}
