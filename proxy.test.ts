import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from './proxy'

function makeJwt(payload: object): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `header.${encoded}.signature`
}

const nowSec = () => Math.floor(Date.now() / 1000)

// proxy() 시나리오 — 리팩토링 전 현재 동작을 잠근다(fetch mock 기반)
describe('proxy', () => {
  const VALID_AT = makeJwt({ exp: nowSec() + 3600 })
  const EXPIRED_AT = makeJwt({ exp: nowSec() - 10 })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  function makeRequest(
    path: string,
    cookieParts: Record<string, string> = {},
    extraHeaders: Record<string, string> = {},
  ): NextRequest {
    const cookie = Object.entries(cookieParts)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ')
    const headers: Record<string, string> = { 'user-agent': 'test-agent', ...extraHeaders }
    if (cookie) headers.cookie = cookie
    return new NextRequest(`http://localhost:3000${path}`, { headers })
  }

  // /api/auth/refresh, /api/auth/me 를 URL로 분기하는 fetch mock
  function stubFetch(handlers: {
    refresh?: () => Response
    me?: () => Response
  }) {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/api/auth/refresh')) {
        if (!handlers.refresh) throw new Error(`unexpected refresh fetch: ${url}`)
        return handlers.refresh()
      }
      if (url.includes('/api/auth/me')) {
        if (!handlers.me) throw new Error(`unexpected me fetch: ${url}`)
        return handlers.me()
      }
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  function refreshOk(accessToken: string): Response {
    return new Response(JSON.stringify({ accessToken }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'set-cookie': 'refresh_token=new-rt; Path=/; Max-Age=1209600; HttpOnly; SameSite=Lax',
      },
    })
  }

  function meOk(status: string, role = 'USER'): Response {
    return new Response(JSON.stringify({ status, role }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ① 비보호 경로(/)는 토큰 없이 통과 — 리다이렉트/fetch 없음
  it('비보호 경로는 토큰 없이 통과한다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    const fetchMock = stubFetch({})
    const res = await proxy(makeRequest('/'))
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  // ①-b '/dashboard'는 비회원도 접근 가능 — 토큰 없이 통과, /login으로 보내지 않는다
  it('/dashboard는 토큰 없이도 통과한다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    const fetchMock = stubFetch({})
    const res = await proxy(makeRequest('/dashboard'))
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  // ①-c 여전히 보호 경로인 /accounts는 토큰 없으면 /login으로 리다이렉트
  it('/accounts는 토큰 없으면 /login으로 리다이렉트한다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    const fetchMock = stubFetch({})
    const res = await proxy(makeRequest('/accounts'))
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  // ② 만료 AT + 유효 RT → refresh 성공 시 새 AT/RT Set-Cookie 부착 후 통과
  it('만료 AT + 유효 RT는 refresh 성공 후 새 AT Set-Cookie를 붙여 통과한다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    // 캐시 히트로 /me 호출을 막아 refresh 경로만 검증
    const fetchMock = stubFetch({ refresh: () => refreshOk('fresh-access-token') })
    const req = makeRequest('/dashboard', {
      'kista-token': EXPIRED_AT,
      refresh_token: 'valid-rt',
      'kista-user-status': 'ACTIVE',
      'kista-user-role': 'USER',
    })
    const res = await proxy(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
    // refresh만 호출, /me는 캐시 히트로 미호출
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const setCookies = res.headers.getSetCookie()
    // 새 AT 쿠키
    expect(setCookies.some((c) => c.startsWith('kista-token=fresh-access-token'))).toBe(true)
    // AT 쿠키 속성 보존
    const at = setCookies.find((c) => c.startsWith('kista-token='))!
    expect(at).toContain('Path=/')
    expect(at).toContain('Max-Age=604800')
    expect(at).toContain('SameSite=Lax')
    expect(at).toContain('HttpOnly')
    // localhost(http)라 Secure 없음
    expect(at).not.toContain('Secure')
    // RT relay 보존
    expect(setCookies.some((c) => c.startsWith('refresh_token=new-rt'))).toBe(true)
  })

  // ③ status/role 캐시 히트 fast path — /me 미호출
  it('status/role 캐시 히트 시 /me를 호출하지 않는다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    const fetchMock = stubFetch({})
    const req = makeRequest('/dashboard', {
      'kista-token': VALID_AT,
      'kista-user-status': 'ACTIVE',
      'kista-user-role': 'USER',
    })
    const res = await proxy(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  // ④ PENDING 상태는 캐싱하지 않고 /pending 으로 리다이렉트
  it('PENDING 상태는 캐싱하지 않고 /pending으로 리다이렉트한다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    const fetchMock = stubFetch({ me: () => meOk('PENDING') })
    const req = makeRequest('/dashboard', { 'kista-token': VALID_AT })
    const res = await proxy(req)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/pending')
    // PENDING 은 캐시 금지 — status/role Set-Cookie 없음
    const setCookies = res.headers.getSetCookie()
    expect(setCookies.some((c) => c.startsWith('kista-user-status='))).toBe(false)
    expect(setCookies.some((c) => c.startsWith('kista-user-role='))).toBe(false)
  })

  // 점1-a: /me 비정상 응답 → 캐시 쿠키 삭제 + 로그인 리다이렉트 (보호 경로에서만 발생 — '/dashboard'는 비보호)
  it('/me 비정상 응답 시 status/role 캐시를 삭제하고 로그인으로 보낸다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    stubFetch({
      me: () => new Response('nope', { status: 401 }),
    })
    const req = makeRequest('/settings', { 'kista-token': VALID_AT })
    const res = await proxy(req)

    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login')
    const setCookies = res.headers.getSetCookie()
    // 삭제(Max-Age=0)로 캐시 무효화
    const statusDel = setCookies.find((c) => c.startsWith('kista-user-status='))
    const roleDel = setCookies.find((c) => c.startsWith('kista-user-role='))
    expect(statusDel).toBeDefined()
    expect(roleDel).toBeDefined()
    // cookies.delete → 값 비움 + 과거 Expires 로 브라우저 삭제 유도
    expect(statusDel).toContain('Expires=Thu, 01 Jan 1970')
    expect(roleDel).toContain('Expires=Thu, 01 Jan 1970')
  })

  // 점1-b: /me 예외(throw) → 캐시 쿠키 삭제하지 않음(현재 동작 잠금, 보호 경로에서만 발생)
  it('/me 호출이 예외로 실패하면 캐시 쿠키를 삭제하지 않는다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    stubFetch({
      me: () => {
        throw new Error('network down')
      },
    })
    const req = makeRequest('/settings', { 'kista-token': VALID_AT })
    const res = await proxy(req)

    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login')
    const setCookies = res.headers.getSetCookie()
    expect(setCookies.some((c) => c.startsWith('kista-user-status='))).toBe(false)
    expect(setCookies.some((c) => c.startsWith('kista-user-role='))).toBe(false)
  })

  // 조합 잠금: AT 갱신(새 AT/RT 부착)과 캐시 삭제가 동시에 일어나는 finalize 경로.
  // delete가 Set-Cookie를 재직렬화 → 그 뒤 raw append 순서가 뒤집히면 새 AT가 유실된다.
  // 만료 AT + 유효 RT + 캐시 없음 + /me 401 → refresh 성공 후 /me 재검증 실패 조합. (보호 경로에서만 /login 리다이렉트)
  it('만료 AT 갱신 후 /me 401이면 캐시 삭제와 새 AT/RT 부착이 동시에 이뤄진다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    const fetchMock = stubFetch({
      refresh: () => refreshOk('fresh-access-token'),
      me: () => new Response('nope', { status: 401 }),
    })
    const req = makeRequest('/settings', {
      'kista-token': EXPIRED_AT,
      refresh_token: 'valid-rt',
    })
    const res = await proxy(req)

    // refresh + /me 둘 다 호출
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login')

    const setCookies = res.headers.getSetCookie()
    // (1) STATUS 삭제 (2) ROLE 삭제
    const statusDel = setCookies.find((c) => c.startsWith('kista-user-status='))
    const roleDel = setCookies.find((c) => c.startsWith('kista-user-role='))
    expect(statusDel).toContain('Expires=Thu, 01 Jan 1970')
    expect(roleDel).toContain('Expires=Thu, 01 Jan 1970')
    // (3) 새 AT Set-Cookie 생존 (delete 재직렬화 뒤 raw append 순서 보존)
    expect(setCookies.some((c) => c.startsWith('kista-token=fresh-access-token'))).toBe(true)
    // (4) RT relay Set-Cookie 생존
    expect(setCookies.some((c) => c.startsWith('refresh_token=new-rt'))).toBe(true)
  })
})
