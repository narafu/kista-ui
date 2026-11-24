import { NextResponse } from 'next/server'

// Route Handler 공통: 인증 실패 시 반환하는 401 JSON 응답
export function unauthorizedJson(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

// 업스트림 연결 실패(재시작 중 ECONNREFUSED 등)를 502 응답으로 바꾼다. 호출부의 `!res.ok` 경로가 그대로 처리한다.
// 요청 취소는 실패가 아니므로 그대로 던진다
export async function fetchUpstream(url: string, init: RequestInit, label: string): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch (e) {
    if (init.signal?.aborted) throw e
    console.error(`[${label}] upstream unreachable`, e)
    return new Response(null, { status: 502 })
  }
}

// kista-api 업스트림 비정상 응답을 클라이언트로 매핑한다.
// 5xx: 서버 로그만 남기고 { error: 'Failed' }로 뭉갠다 (내부 오류 노출 방지)
// 예외: 사용자용 고정 문구가 담긴 503은 title/detail/status/code만 골라 relay한다
//   - BROKER_UNAVAILABLE(증권사 장애): 모든 메서드
//   - ENGINE_RESTARTING(Caddy가 worker 재시작 중 엔진 경로에 싣는 응답): GET만. 연결이 끊긴 쓰기는 커밋됐을 수 있어
//     "다시 시도" 문구를 mutation 토스트에 띄우지 않는다
//   (다른 503은 detail에 내부 호스트 등 예외 메시지가 담길 수 있어 그대로 숨긴다)
// 4xx: 업스트림 JSON body를 그대로 relay한다 (파싱 실패 시 { error: 'Failed' })
export async function relayUpstreamError(res: Response, label: string, method: HttpMethod): Promise<NextResponse> {
  if (res.status >= 500) {
    const text = await res.text().catch(() => '')
    console.error(`[${label}] ${res.status}`, text)
    const relayed = res.status === 503 ? parseRelayable503(text, method) : null
    return NextResponse.json(relayed ?? { error: 'Failed' }, { status: res.status })
  }
  try {
    const errBody = await res.json()
    return NextResponse.json(errBody, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: res.status })
  }
}

function parseRelayable503(text: string, method: HttpMethod): { title: string; detail: string; status: number; code: string } | null {
  try {
    const body = JSON.parse(text)
    const relayable = body?.code === 'BROKER_UNAVAILABLE' || (body?.code === 'ENGINE_RESTARTING' && method === 'GET')
    if (!relayable || typeof body.detail !== 'string') return null
    return { title: body.title, detail: body.detail, status: 503, code: body.code }
  } catch {
    return null
  }
}

// Route Handler 공통: 204 No Content 응답
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

// SSE 인증 실패 응답. EventSource는 4xx를 onerror로만 받아 상태 코드를 알 수 없으므로
// 200 SSE 스트림으로 auth-error 이벤트를 보내 클라이언트가 재연결을 중단하게 한다.
export function sseAuthErrorResponse(): Response {
  const body = new TextEncoder().encode('event: auth-error\ndata: unauthorized\n\n')
  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}
