import { getAuthToken } from '@shared/lib/auth/token'
import { getApiBaseUrl } from '@shared/lib/env'
import type { NextRequest } from 'next/server'
import { Agent, fetch as undiciFetch } from 'undici'

export const dynamic = 'force-dynamic'

// SSE는 장기 연결이므로 undici 기본 bodyTimeout(300s) 비활성화
const sseAgent = new Agent({ bodyTimeout: 0, headersTimeout: 0 })

export async function GET(request: NextRequest) {
  const token = await getAuthToken()

  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }

  // undici fetch 사용 — dispatcher 옵션이 전역 fetch에서 지원되지 않아 TypeError 발생
  const upstream = await undiciFetch(`${getApiBaseUrl()}/api/auth/status-stream`, {
    headers: { Authorization: `Bearer ${token}` },
    dispatcher: sseAgent,
    signal: request.signal,
  })

  if (!upstream.ok) {
    return new Response('Upstream error', { status: upstream.status })
  }

  return new Response(upstream.body as BodyInit, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
