import { getAuthToken } from '@shared/lib/auth/token'
import type { NextRequest } from 'next/server'
import { Agent, fetch as undiciFetch } from 'undici'

export const dynamic = 'force-dynamic'

// SSE는 장기 연결이므로 undici 기본 bodyTimeout(300s) 비활성화
const sseAgent = new Agent({ bodyTimeout: 0, headersTimeout: 0 })

export async function GET(request: NextRequest) {
  const token = await getAuthToken()
  if (!token) {
    // EventSource는 4xx를 onerror로만 받아 상태 코드를 알 수 없음
    // → 200 SSE 스트림으로 auth-error 이벤트를 보내 클라이언트가 재연결을 중단하게 함
    const body = new TextEncoder().encode('event: auth-error\ndata: unauthorized\n\n')
    return new Response(body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
  }

  const apiUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL
  // undici fetch 사용 — dispatcher 옵션이 전역 fetch에서 지원되지 않아 TypeError 발생
  const upstream = await undiciFetch(`${apiUrl}/api/trades/stream`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    dispatcher: sseAgent,
    signal: request.signal,
  })

  if (!upstream.ok) {
    // 업스트림 401/403(토큰 만료·권한 상실) → no-token 분기와 동일하게 auth-error 이벤트로 재연결 중단 유도
    if (upstream.status === 401 || upstream.status === 403) {
      const body = new TextEncoder().encode('event: auth-error\ndata: unauthorized\n\n')
      return new Response(body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      })
    }
    return new Response('Upstream error', { status: upstream.status })
  }

  return new Response(upstream.body as BodyInit, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
