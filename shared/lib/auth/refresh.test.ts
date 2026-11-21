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

  it('서버에 닿지 못한 연결 실패는 UNAVAILABLE', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } })))
    expect(await refreshAccessToken({ rt: 'rt1', userAgent: 'ua' })).toBe(REFRESH_UNAVAILABLE)
  })

  it.each([
    ['연결 끊김', new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } })],
    ['timeout', new DOMException('timed out', 'TimeoutError')],
  ])('회전이 커밋됐을 수 있는 %s는 null', async (_name, error) => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))
    expect(await refreshAccessToken({ rt: 'rt1', userAgent: 'ua' })).toBeNull()
  })

  it('503은 UNAVAILABLE', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('down', { status: 503 })))
    expect(await refreshAccessToken({ rt: 'rt1', userAgent: 'ua' })).toBe(REFRESH_UNAVAILABLE)
  })

  it.each([500, 502])('%i 응답은 회전 여부를 알 수 없어 null', async (status) => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('down', { status })))
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
