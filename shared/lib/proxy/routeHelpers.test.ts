import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchUpstream,
  noContent,
  relayUpstreamError,
  sseAuthErrorResponse,
  unauthorizedJson,
  type HttpMethod,
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

    const res = await relayUpstreamError(upstream, 'test-label', 'GET')

    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'Failed' })
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[test-label] 502'),
      'internal boom',
    )
    consoleErrorSpy.mockRestore()
  })

  it.each(['Toss API Error', 'Meritz API Error'])('증권사 장애 503(%s)은 title/detail/status/code만 골라 relay한다', async (title) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const upstream = new Response(JSON.stringify({
      title,
      detail: '증권사 API 조회에 실패했습니다. 잠시 후 다시 시도해주세요.',
      status: 503,
      code: 'BROKER_UNAVAILABLE',
      instance: '/api/trading-cycles/x/preview',
      debug: 'internal',
    }), { status: 503 })

    const res = await relayUpstreamError(upstream, 'test-label', 'GET')

    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({
      title,
      detail: '증권사 API 조회에 실패했습니다. 잠시 후 다시 시도해주세요.',
      status: 503,
      code: 'BROKER_UNAVAILABLE',
    })
  })

  it('증권사 장애 503은 POST여도 relay한다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const upstream = new Response(JSON.stringify({
      title: 'Toss API Error',
      detail: '증권사 API 조회에 실패했습니다. 잠시 후 다시 시도해주세요.',
      status: 503,
      code: 'BROKER_UNAVAILABLE',
    }), { status: 503 })

    const res = await relayUpstreamError(upstream, 'test-label', 'POST')

    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({
      title: 'Toss API Error',
      detail: '증권사 API 조회에 실패했습니다. 잠시 후 다시 시도해주세요.',
      status: 503,
      code: 'BROKER_UNAVAILABLE',
    })
  })

  const engineRestarting = { type: 'about:blank', title: 'Engine Restarting', status: 503, detail: '매매 서버를 재시작하는 중입니다. 잠시 후 다시 시도해 주세요.', code: 'ENGINE_RESTARTING' }

  it('엔진 재시작 503은 GET이면 title/detail/status/code만 골라 relay한다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await relayUpstreamError(new Response(JSON.stringify(engineRestarting), { status: 503 }), 'test-label', 'GET')

    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ title: 'Engine Restarting', detail: engineRestarting.detail, status: 503, code: 'ENGINE_RESTARTING' })
  })

  it.each([
    ['다른 code의 JSON 503', 503, JSON.stringify({ title: 'Trading Core Unavailable', detail: 'I/O error on GET http://internal:8081', code: 'TRADING_CORE_UNAVAILABLE' }), 'GET'],
    ['code 없는 증권사 title 503', 503, JSON.stringify({ title: 'Toss API Error', detail: 'x' }), 'GET'],
    ['비JSON 503(게이트웨이 등)', 503, '<html>Service Unavailable</html>', 'GET'],
    ['증권사 장애 code여도 502', 502, JSON.stringify({ title: 'Toss API Error', detail: 'x', code: 'BROKER_UNAVAILABLE' }), 'GET'],
    ['POST의 엔진 재시작 503', 503, JSON.stringify(engineRestarting), 'POST'],
  ])('%s는 { error: "Failed" }로 숨긴다', async (_name, status, body, method) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await relayUpstreamError(new Response(body, { status }), 'test-label', method as HttpMethod)

    expect(res.status).toBe(status)
    expect(await res.json()).toEqual({ error: 'Failed' })
  })

  it('4xx + JSON body는 업스트림 body를 그대로 relay한다', async () => {
    const upstream = new Response(JSON.stringify({ detail: 'bad request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await relayUpstreamError(upstream, 'test-label', 'GET')

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ detail: 'bad request' })
  })

  it('4xx + 비JSON body는 { error: "Failed" }로 대체한다', async () => {
    const upstream = new Response('not json', { status: 404 })

    const res = await relayUpstreamError(upstream, 'test-label', 'GET')

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

describe('fetchUpstream', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('연결 실패는 502 응답이 된다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    const res = await fetchUpstream('https://api.test/x', {}, 'test')
    expect(res.status).toBe(502)
  })

  it('요청 취소는 그대로 던진다', async () => {
    const controller = new AbortController()
    controller.abort()
    const abort = new DOMException('aborted', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort))
    await expect(fetchUpstream('https://api.test/x', { signal: controller.signal }, 'test')).rejects.toBe(abort)
  })
})
