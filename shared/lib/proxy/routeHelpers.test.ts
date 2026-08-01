import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  noContent,
  relayUpstreamError,
  requireAuthToken,
  sseAuthErrorResponse,
  unauthorizedJson,
} from './routeHelpers'

vi.mock('@shared/lib/auth/token', () => ({
  getAuthToken: vi.fn(),
}))

describe('unauthorizedJson', () => {
  it('401과 { error: "Unauthorized" } body를 반환한다', async () => {
    const res = unauthorizedJson()
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })
})

describe('requireAuthToken', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('쿠키에 토큰이 있으면 그대로 반환한다', async () => {
    const { getAuthToken } = await import('@shared/lib/auth/token')
    vi.mocked(getAuthToken).mockResolvedValue('test-token')

    await expect(requireAuthToken()).resolves.toBe('test-token')
  })

  it('토큰이 없으면 null을 반환한다', async () => {
    const { getAuthToken } = await import('@shared/lib/auth/token')
    vi.mocked(getAuthToken).mockResolvedValue(undefined)

    await expect(requireAuthToken()).resolves.toBeNull()
  })
})

describe('relayUpstreamError', () => {
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
