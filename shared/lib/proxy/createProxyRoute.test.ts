import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createProxyRoute } from './createProxyRoute'

vi.mock('@shared/lib/auth/token', () => ({
  getAuthToken: vi.fn().mockResolvedValue('test-token'),
}))

describe('createProxyRoute', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('정적 Route Handler에서 context 없이 기본 경로를 프록시한다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { GET } = createProxyRoute({ basePath: '/api/daily-trades' })
    const request = new NextRequest('https://kista.test/api/daily-trades?from=2026-07-13&to=2026-07-14')

    const response = await (GET as unknown as (request: NextRequest) => Promise<Response>)(request)

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/daily-trades?from=2026-07-13&to=2026-07-14'),
      expect.any(Object),
    )
  })

  it('정적 Route Handler에서 params 없는 context로 기본 경로를 프록시한다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://kista-api.test')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { GET } = createProxyRoute({ basePath: '/api/daily-trades' })
    const request = new NextRequest('https://kista.test/api/daily-trades?from=2026-07-13&to=2026-07-14')

    const response = await (GET as unknown as (
      request: NextRequest,
      context: object,
    ) => Promise<Response>)(request, {})

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/daily-trades?from=2026-07-13&to=2026-07-14'),
      expect.any(Object),
    )
  })
})
