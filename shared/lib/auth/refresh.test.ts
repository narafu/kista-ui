import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildAtSetCookie, REFRESH_UNAVAILABLE, refreshAccessToken } from './refresh'

describe('refreshAccessToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('성공: accessToken + RT relay Set-Cookie 반환', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'new-at' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'set-cookie': 'refresh_token=rt2; Path=/; HttpOnly',
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await refreshAccessToken({ rt: 'rt1', userAgent: 'ua', timeoutMs: 5000 })

    expect(result).toEqual({
      accessToken: 'new-at',
      setCookieHeaders: ['refresh_token=rt2; Path=/; HttpOnly'],
    })
    // RT 쿠키/User-Agent 전달 확인
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://kista-api.test/api/auth/refresh')
    expect(init.headers.Cookie).toBe('refresh_token=rt1')
    expect(init.headers['User-Agent']).toBe('ua')
  })

  it('비OK 응답이면 null', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('nope', { status: 401 })),
    )
    expect(await refreshAccessToken({ rt: 'rt1', userAgent: 'ua' })).toBeNull()
  })

  it('accessToken 누락이면 null', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    expect(await refreshAccessToken({ rt: 'rt1', userAgent: 'ua' })).toBeNull()
  })

  it.each([
    ['연결 거부', new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } })],
    ['연결 끊김', new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } })],
    ['timeout', new DOMException('timed out', 'TimeoutError')],
  ])('%s는 결과를 알 수 없어 UNAVAILABLE(재시도 안전)', async (_name, error) => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))
    expect(await refreshAccessToken({ rt: 'rt1', userAgent: 'ua' })).toBe(REFRESH_UNAVAILABLE)
  })

  it('200 응답 본문을 읽지 못하면 UNAVAILABLE', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"accessTok', { status: 200 })))
    expect(await refreshAccessToken({ rt: 'rt1', userAgent: 'ua' })).toBe(REFRESH_UNAVAILABLE)
  })

  it.each([408, 429, 500, 502, 503, 504])('%i 응답은 UNAVAILABLE', async (status) => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('down', { status })))
    expect(await refreshAccessToken({ rt: 'rt1', userAgent: 'ua' })).toBe(REFRESH_UNAVAILABLE)
  })

  it('요청 전에 나는 TypeError(cause 없음 — 쿠키 값 이상)는 매번 반복되므로 null', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Cannot convert argument to a ByteString')))
    expect(await refreshAccessToken({ rt: 'rt1', userAgent: 'ua' })).toBeNull()
  })

  it.each([400, 401, 403])('%i 응답은 거절로 보고 null', async (status) => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('no', { status })))
    expect(await refreshAccessToken({ rt: 'rt1', userAgent: 'ua' })).toBeNull()
  })

  it('API_BASE_URL 미설정이면 fetch 없이 UNAVAILABLE', async () => {
    vi.stubEnv('API_BASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await refreshAccessToken({ rt: 'rt1', userAgent: 'ua' })).toBe(REFRESH_UNAVAILABLE)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('timeoutMs 미지정 시 signal 없이 호출', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'x' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    await refreshAccessToken({ rt: 'rt1', userAgent: 'ua' })
    expect(fetchMock.mock.calls[0][1].signal).toBeUndefined()
    expect(fetchMock.mock.calls[0][1].cache).toBe('no-store')
  })
})

describe('buildAtSetCookie', () => {
  it('http(비secure): Secure 플래그 없음, 속성 보존', () => {
    expect(buildAtSetCookie('tok', false)).toBe(
      'kista-token=tok; Path=/; Max-Age=604800; SameSite=Lax; HttpOnly',
    )
  })
  it('https(secure): Secure 플래그 부착', () => {
    expect(buildAtSetCookie('tok', true)).toBe(
      'kista-token=tok; Path=/; Max-Age=604800; SameSite=Lax; HttpOnly; Secure',
    )
  })
})
