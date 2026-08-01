import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { cookiesMock, refreshAccessTokenMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  refreshAccessTokenMock: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: cookiesMock }))
vi.mock('@shared/lib/auth/refresh', async () => {
  const actual = await vi.importActual<typeof import('@shared/lib/auth/refresh')>(
    '@shared/lib/auth/refresh',
  )
  return { ...actual, refreshAccessToken: refreshAccessTokenMock }
})

async function loadPost() {
  const mod = await import('./route')
  return mod.POST
}

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/refresh', {
    method: 'POST',
    headers: { 'user-agent': 'ua', ...headers },
  })
}

function stubCookies(rt: string | undefined) {
  cookiesMock.mockResolvedValue({
    get: (name: string) =>
      name === 'refresh_token' && rt !== undefined ? { value: rt } : undefined,
  })
}

describe('/api/auth/refresh POST', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('RT 쿠키 없으면 401', async () => {
    stubCookies(undefined)
    const POST = await loadPost()
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'No refresh token' })
    expect(refreshAccessTokenMock).not.toHaveBeenCalled()
  })

  it('refresh 실패면 401', async () => {
    stubCookies('rt1')
    refreshAccessTokenMock.mockResolvedValue(null)
    const POST = await loadPost()
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Refresh failed' })
  })

  it('성공 시 AT + RT relay Set-Cookie 를 모두 부착(둘 다 생존)', async () => {
    stubCookies('rt1')
    refreshAccessTokenMock.mockResolvedValue({
      accessToken: 'new-at',
      setCookieHeaders: ['refresh_token=rt2; Path=/; HttpOnly'],
    })
    const POST = await loadPost()
    const res = await POST(makeRequest())

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    const setCookies = res.headers.getSetCookie()
    // AT 쿠키 생존 + 속성 보존
    const at = setCookies.find((c) => c.startsWith('kista-token='))
    expect(at).toBe('kista-token=new-at; Path=/; Max-Age=604800; SameSite=Lax; HttpOnly')
    // RT relay 생존
    expect(setCookies).toContain('refresh_token=rt2; Path=/; HttpOnly')
    // rt 는 refreshAccessToken 에 그대로 전달
    expect(refreshAccessTokenMock).toHaveBeenCalledWith({ rt: 'rt1', userAgent: 'ua' })
  })

  it('x-forwarded-proto=https 면 AT 쿠키에 Secure 부착', async () => {
    stubCookies('rt1')
    refreshAccessTokenMock.mockResolvedValue({ accessToken: 'new-at', setCookieHeaders: [] })
    const POST = await loadPost()
    const res = await POST(makeRequest({ 'x-forwarded-proto': 'https' }))
    const at = res.headers.getSetCookie().find((c) => c.startsWith('kista-token='))
    expect(at).toContain('; Secure')
  })
})
