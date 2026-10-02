import { NextResponse } from 'next/server'

// Route Handler 공통: 인증 실패 시 반환하는 401 JSON 응답
export function unauthorizedJson(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// kista-api 업스트림 비정상 응답을 클라이언트로 매핑한다.
// 5xx: 서버 로그만 남기고 { error: 'Failed' }로 뭉갠다 (내부 오류 노출 방지)
// 예외: 증권사 장애 503(code=BROKER_UNAVAILABLE)은 사용자용 고정 문구라 title/detail/status/code만 골라 relay한다
//   (다른 503은 detail에 내부 호스트 등 예외 메시지가 담길 수 있어 그대로 숨긴다)
// 4xx: 업스트림 JSON body를 그대로 relay한다 (파싱 실패 시 { error: 'Failed' })
export async function relayUpstreamError(res: Response, label: string): Promise<NextResponse> {
  if (res.status >= 500) {
    const text = await res.text().catch(() => '')
    console.error(`[${label}] ${res.status}`, text)
    const broker = res.status === 503 ? parseBrokerUnavailable(text) : null
    return NextResponse.json(broker ?? { error: 'Failed' }, { status: res.status })
  }
  try {
    const errBody = await res.json()
    return NextResponse.json(errBody, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: res.status })
  }
}

function parseBrokerUnavailable(text: string): { title: string; detail: string; status: number; code: string } | null {
  try {
    const body = JSON.parse(text)
    if (body?.code !== 'BROKER_UNAVAILABLE' || typeof body.detail !== 'string') return null
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
