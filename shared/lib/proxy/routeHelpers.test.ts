import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  noContent,
  relayUpstreamError,
  sseAuthErrorResponse,
  unauthorizedJson,
} from './routeHelpers'

describe('unauthorizedJson', () => {
  it('401과 { error: "Unauthorized" } body를 반환한다', async () => {
    const res = unauthorizedJson()
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })
})

describe('relayUpstreamError', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('5xx는 로그만 남기고 { error: "Failed" }를 반환한다', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const upstream = new Response('internal boom', { status: 502 })

    const res = await relayUpstreamError(upstream, 'test-label')

    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'Failed' })
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[test-label] 502'),
      'internal boom',
    )
    consoleErrorSpy.mockRestore()
  })

  it.each(['KIS API Error', 'Toss API Error'])('증권사 장애 503(%s)은 title/detail/status만 골라 relay한다', async (title) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const upstream = new Response(JSON.stringify({
      title,
      detail: '증권사 API 조회에 실패했습니다. 잠시 후 다시 시도해주세요',
      status: 503,
      instance: '/api/trading-cycles/x/preview',
      debug: 'internal',
    }), { status: 503 })

    const res = await relayUpstreamError(upstream, 'test-label')

    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({
      title,
      detail: '증권사 API 조회에 실패했습니다. 잠시 후 다시 시도해주세요',
      status: 503,
    })
  })

  it.each([
    ['다른 title의 JSON 503', 503, JSON.stringify({ title: 'Trading Core Unavailable', detail: 'I/O error on GET http://internal:8081' })],
    ['비JSON 503(게이트웨이 등)', 503, '<html>Service Unavailable</html>'],
    ['증권사 장애 title이어도 502', 502, JSON.stringify({ title: 'KIS API Error', detail: 'x' })],
  ])('%s는 { error: "Failed" }로 숨긴다', async (_name, status, body) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await relayUpstreamError(new Response(body, { status }), 'test-label')

    expect(res.status).toBe(status)
    expect(await res.json()).toEqual({ error: 'Failed' })
  })

  it('4xx + JSON body는 업스트림 body를 그대로 relay한다', async () => {
    const upstream = new Response(JSON.stringify({ detail: 'bad request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await relayUpstreamError(upstream, 'test-label')

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ detail: 'bad request' })
  })

  it('4xx + 비JSON body는 { error: "Failed" }로 대체한다', async () => {
    const upstream = new Response('not json', { status: 404 })

    const res = await relayUpstreamError(upstream, 'test-label')

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Failed' })
  })
})

describe('noContent', () => {
  it('204와 빈 body를 반환한다', async () => {
    const res = noContent()
    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')
  })
})

describe('sseAuthErrorResponse', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('200 SSE 스트림으로 auth-error 이벤트를 반환한다', async () => {
    const res = sseAuthErrorResponse()

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    expect(res.headers.get('Cache-Control')).toBe('no-cache')
    expect(await res.text()).toBe('event: auth-error\ndata: unauthorized\n\n')
  })
})
