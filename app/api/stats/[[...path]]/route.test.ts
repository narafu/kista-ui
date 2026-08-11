import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getAuthTokenMock } = vi.hoisted(() => ({
  getAuthTokenMock: vi.fn(),
}))

vi.mock('@shared/lib/auth/token', () => ({
  getAuthToken: getAuthTokenMock,
}))

const originalApiBaseUrl = process.env.API_BASE_URL

describe('/api/stats proxy route', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.API_BASE_URL = 'http://kista-api.test'
    getAuthTokenMock.mockResolvedValue('test-token')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalApiBaseUrl === undefined) delete process.env.API_BASE_URL
    else process.env.API_BASE_URL = originalApiBaseUrl
  })

  it('forwards the housing benchmark path and every query parameter to kista-api', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ points: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)
    const { GET } = await import('./route')
    const request = new NextRequest(
      'https://kista.test/api/stats/housing-benchmark?scope=STRATEGY&strategyId=strategy-1&regionCode=1100000000&from=2021-07-01&to=2026-07-01'
    )

    const response = await GET(request, {
      params: Promise.resolve({ path: ['housing-benchmark'] }),
    })

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://kista-api.test/api/stats/housing-benchmark?scope=STRATEGY&strategyId=strategy-1&regionCode=1100000000&from=2021-07-01&to=2026-07-01',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer test-token' },
      })
    )
  })
})
