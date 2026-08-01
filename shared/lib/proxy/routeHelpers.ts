import { NextResponse } from 'next/server'
import { getAuthToken } from '@shared/lib/auth/token'

// Route Handler 공통: 인증 실패 시 반환하는 401 JSON 응답
export function unauthorizedJson(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Route Handler 공통: kista-token 쿠키에서 토큰을 읽는다. 없으면 null
// (호출부는 `if (!token) return unauthorizedJson()` 패턴으로 사용)
export async function requireAuthToken(): Promise<string | null> {
  const token = await getAuthToken()
  return token ?? null
}

// kista-api 업스트림 비정상 응답을 클라이언트로 매핑한다.
// 5xx: 서버 로그만 남기고 { error: 'Failed' }로 뭉갠다 (내부 오류 노출 방지)
// 4xx: 업스트림 JSON body를 그대로 relay한다 (파싱 실패 시 { error: 'Failed' })
export async function relayUpstreamError(res: Response, label: string): Promise<NextResponse> {
  if (res.status >= 500) {
    console.error(`[${label}] ${res.status}`, await res.text().catch(() => ''))
    return NextResponse.json({ error: 'Failed' }, { status: res.status })
  }
  try {
    const errBody = await res.json()
    return NextResponse.json(errBody, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: res.status })
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
