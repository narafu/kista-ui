import { afterEach, describe, expect, it, vi } from 'vitest'

describe('getMetaBundle', () => {
  const originalApiBaseUrl = process.env.API_BASE_URL

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    if (originalApiBaseUrl === undefined) {
      delete process.env.API_BASE_URL
    } else {
      process.env.API_BASE_URL = originalApiBaseUrl
    }
  })

  it('falls back to public meta when bearer token is expired', async () => {
    process.env.API_BASE_URL = 'https://api.example.test'
    const { getMetaBundle } = await import('./index')
    const meta = {
      tickers: [],
      strategyTypes: [],
      enums: {},
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json(meta))

    await expect(getMetaBundle('expired-token')).resolves.toEqual(meta)

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.example.test/api/meta',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer expired-token',
        }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.example.test/api/meta',
      { next: { revalidate: 3600 } },
    )
  })
})
