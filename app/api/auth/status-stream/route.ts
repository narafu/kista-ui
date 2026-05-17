import { getAuthToken } from '@/lib/auth/token'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const token = await getAuthToken()

  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }

  const apiUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL
  const upstream = await fetch(`${apiUrl}/api/auth/status-stream`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: request.signal,
  })

  if (!upstream.ok) {
    return new Response('Upstream error', { status: upstream.status })
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
