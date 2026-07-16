import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch, apiMsg, jsonBody } from './index'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('apiMsg', () => {
  it('ApiError body의 detail을 우선 사용하고, detail이 없으면 message를 사용한다', () => {
    expect(apiMsg(new ApiError(400, { detail: 'detail msg', message: 'other msg' }), 'fallback')).toBe('detail msg')
    expect(apiMsg(new ApiError(400, { message: 'other msg' }), 'fallback')).toBe('other msg')
  })

  it('detail/message가 없거나 ApiError가 아니면 fallback을 반환한다', () => {
    expect(apiMsg(new ApiError(400, {}), 'fallback')).toBe('fallback')
    expect(apiMsg(new ApiError(400, null), 'fallback')).toBe('fallback')
    expect(apiMsg(new Error('not api error'), 'fallback')).toBe('fallback')
  })
})

describe('jsonBody', () => {
  it('method/헤더/직렬화된 body를 구성한다', () => {
    const init = jsonBody('POST', { foo: 'bar' })
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init.body).toBe(JSON.stringify({ foo: 'bar' }))
  })
})

describe('apiFetch', () => {
  it('baseUrl이 설정되지 않으면 에러를 던진다', async () => {
    await expect(apiFetch('/foo', {}, 'token')).rejects.toThrow()
  })

  it('Authorization: Bearer 헤더를 포함해 요청한다', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.test')
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/foo', {}, 'tok123')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.test/foo')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok123')
  })

  it('비정상 응답이면 ApiError(status, body)를 던진다', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.test')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(400, { detail: 'bad request' })))

    let caught: unknown
    try {
      await apiFetch('/foo', {}, 'token')
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(ApiError)
    expect(caught).toMatchObject({ status: 400, body: { detail: 'bad request' } })
  })

  it('204 또는 content-length 0 응답은 undefined를 반환한다', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.test')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })))
    await expect(apiFetch('/foo', {}, 'token')).resolves.toBeUndefined()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(null, { status: 200, headers: { 'content-length': '0' } })
      )
    )
    await expect(apiFetch('/bar', {}, 'token')).resolves.toBeUndefined()
  })
})

describe('clientFetch', () => {
  beforeEach(() => {
    vi.resetModules()
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    })
  })

  it('정상 응답이면 json을 그대로 반환한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(200, { hello: 'world' })))
    const { clientFetch } = await import('./index')

    await expect(clientFetch('/api/foo')).resolves.toEqual({ hello: 'world' })
  })

  it('401이 아닌 비정상 응답이면 ApiError를 던진다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(500, { detail: 'boom' })))
    const { clientFetch, ApiError: FreshApiError } = await import('./index')

    let caught: unknown
    try {
      await clientFetch('/api/foo')
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(FreshApiError)
    expect(caught).toMatchObject({ status: 500, body: { detail: 'boom' } })
  })

  it('401 이후 refresh와 재시도가 모두 성공하면 재시도 결과를 반환한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, {})) // 원 요청
      .mockResolvedValueOnce(jsonResponse(200, {})) // refresh
      .mockResolvedValueOnce(jsonResponse(200, { value: 42 })) // 재시도
    vi.stubGlobal('fetch', fetchMock)
    const { clientFetch } = await import('./index')

    await expect(clientFetch('/api/foo')).resolves.toEqual({ value: 42 })
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/refresh', { method: 'POST' })
  })

  it('refresh가 실패하면 로그아웃 요청 후 /dashboard로 이동한다', async () => {
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, {})) // 원 요청
      .mockResolvedValueOnce(jsonResponse(500, {})) // refresh 실패
      .mockResolvedValueOnce(jsonResponse(200, {})) // logout
    vi.stubGlobal('fetch', fetchMock)
    const { clientFetch } = await import('./index')

    void clientFetch('/api/foo') // doLogout은 영원히 resolve되지 않으므로 await하지 않는다

    await vi.waitFor(() => {
      expect(window.location.href).toBe('/dashboard')
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' })
  })

  it('401 body가 TOKEN_BLACKLISTED면 로그아웃 URL에 에러 쿼리를 포함한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { error: 'TOKEN_BLACKLISTED' })) // 원 요청
      .mockResolvedValueOnce(jsonResponse(500, {})) // refresh 실패
      .mockResolvedValueOnce(jsonResponse(200, {})) // logout
    vi.stubGlobal('fetch', fetchMock)
    const { clientFetch } = await import('./index')

    void clientFetch('/api/foo')

    await vi.waitFor(() => {
      expect(window.location.href).toBe('/dashboard?error=token_blacklisted')
    })
  })

  it('refresh 성공 후 재시도도 401이면 로그아웃한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, {})) // 원 요청
      .mockResolvedValueOnce(jsonResponse(200, {})) // refresh 성공
      .mockResolvedValueOnce(jsonResponse(401, {})) // 재시도도 401
      .mockResolvedValueOnce(jsonResponse(200, {})) // logout
    vi.stubGlobal('fetch', fetchMock)
    const { clientFetch } = await import('./index')

    void clientFetch('/api/foo')

    await vi.waitFor(() => {
      expect(window.location.href).toBe('/dashboard')
    })
  })

  it('동시에 401이 두 건 발생해도 refresh 호출은 한 번만 일어난다', async () => {
    const callCounts: Record<string, number> = {}
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/auth/refresh') return jsonResponse(200, {})
      callCounts[url] = (callCounts[url] ?? 0) + 1
      return callCounts[url] === 1 ? jsonResponse(401, {}) : jsonResponse(200, { url })
    })
    vi.stubGlobal('fetch', fetchMock)
    const { clientFetch } = await import('./index')

    const [a, b] = await Promise.all([clientFetch('/api/a'), clientFetch('/api/b')])

    expect(a).toEqual({ url: '/api/a' })
    expect(b).toEqual({ url: '/api/b' })
    const refreshCalls = fetchMock.mock.calls.filter(([url]) => url === '/api/auth/refresh')
    expect(refreshCalls).toHaveLength(1)
  })
})
