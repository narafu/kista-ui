import { getAuthToken } from '@/lib/auth/token'
import type { NextRequest } from 'next/server'
import { Agent } from 'undici'

export const dynamic = 'force-dynamic'

// SSE는 장기 연결이므로 undici 기본 bodyTimeout(300s) 비활성화
const sseAgent = new Agent({ bodyTimeout: 0, headersTimeout: 0 })

export async function GET(request: NextRequest) {
  const token = await getAuthToken()

  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }

  const apiUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL
  const upstream = await fetch(`${apiUrl}/api/auth/status-stream`, {
    headers: { Authorization: `Bearer ${token}` },
    // @ts-ignore — undici-specific dispatcher, not in standard RequestInit
    dispatcher: sseAgent,
    signal: request.signal,
    cache: 'no-store',
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
