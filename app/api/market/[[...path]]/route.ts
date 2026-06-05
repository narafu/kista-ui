import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAuthToken } from '@shared/lib/auth/token'

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL

type Params = { params: Promise<{ path?: string[] }> }

export async function GET(req: NextRequest, { params }: Params) {
  const token = await getAuthToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const path = (await params).path ?? []
  const subPath = path.length > 0 ? `/${path.join('/')}` : ''
  const url = `${API_BASE_URL}/api/market${subPath}${req.nextUrl.search}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    if (res.status >= 500) console.error(`[market${subPath} GET] ${res.status}`, await res.text().catch(() => ''))
    return NextResponse.json({ error: 'Failed' }, { status: res.status })
  }

  return NextResponse.json(await res.json(), { status: res.status })
}
