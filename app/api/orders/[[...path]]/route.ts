import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAuthToken } from '@shared/lib/auth/token'

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL

type Params = { params: Promise<{ path?: string[] }> }

async function proxy(request: NextRequest, pathSegments: string[]) {
  const token = await getAuthToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subPath = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : ''
  const url = `${API_BASE_URL}/api/orders${subPath}${request.nextUrl.search}`
  const headers: HeadersInit = { Authorization: `Bearer ${token}` }

  const res = await fetch(url, {
    method: request.method,
    headers,
    signal: request.signal,
    cache: 'no-store',
  })

  if (!res.ok) {
    if (res.status >= 500) console.error(`[orders${subPath} ${request.method}] ${res.status}`, await res.text().catch(() => ''))
    return NextResponse.json({ error: 'Failed' }, { status: res.status })
  }

  if (res.status === 204) return new NextResponse(null, { status: 204 })
  return NextResponse.json(await res.json(), { status: res.status })
}

export async function GET(req: NextRequest, { params }: Params) {
  return proxy(req, (await params).path ?? [])
}
export async function DELETE(req: NextRequest, { params }: Params) {
  return proxy(req, (await params).path ?? [])
}
