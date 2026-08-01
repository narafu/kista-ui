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

  it('fetches meta with 1-hour Data Cache', async () => {
    process.env.API_BASE_URL = 'https://api.example.test'
    const { getMetaBundle } = await import('./index')
    const meta = {
      tickers: [],
      strategyTypes: [],
      enums: {},
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json(meta))

    await expect(getMetaBundle()).resolves.toEqual(meta)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/api/meta',
      { next: { revalidate: 3600 } },
    )
  })

  it('throws ApiError when fetch fails', async () => {
    process.env.API_BASE_URL = 'https://api.example.test'
    const { getMetaBundle } = await import('./index')
    const { ApiError } = await import('@shared/lib/api-client')
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 500 }))

    let caught: unknown
    try {
      await getMetaBundle()
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(ApiError)
    expect(caught).toMatchObject({ status: 500 })
  })
})
