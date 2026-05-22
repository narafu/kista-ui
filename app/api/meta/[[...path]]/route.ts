import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAuthToken } from '@/lib/auth/token'

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL

type Params = { params: Promise<{ path?: string[] }> }

async function proxy(request: NextRequest, pathSegments: string[]) {
  const token = await getAuthToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subPath = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : ''
  const url = `${API_BASE_URL}/api/meta${subPath}${request.nextUrl.search}`
  const headers: HeadersInit = { 'Authorization': `Bearer ${token}` }
  let body: BodyInit | undefined

  if (request.method !== 'GET' && request.method !== 'DELETE') {
    const ct = request.headers.get('content-type')
    if (ct) headers['Content-Type'] = ct
    const text = await request.text()
    if (text) body = text
  }

  const res = await fetch(url, { method: request.method, headers, body, signal: request.signal })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    console.error(`[meta${subPath} ${request.method}] ${res.status}`, errBody)
    return NextResponse.json({ error: 'Failed' }, { status: res.status })
  }
  if (res.status === 204) return new NextResponse(null, { status: 204 })
  return NextResponse.json(await res.json(), { status: res.status })
}

export async function GET(req: NextRequest, { params }: Params) {
  return proxy(req, (await params).path ?? [])
}
export async function POST(req: NextRequest, { params }: Params) {
  return proxy(req, (await params).path ?? [])
}
export async function PUT(req: NextRequest, { params }: Params) {
  return proxy(req, (await params).path ?? [])
}
export async function PATCH(req: NextRequest, { params }: Params) {
  return proxy(req, (await params).path ?? [])
}
export async function DELETE(req: NextRequest, { params }: Params) {
  return proxy(req, (await params).path ?? [])
}
