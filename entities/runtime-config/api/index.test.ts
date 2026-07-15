import { afterEach, describe, expect, it, vi } from 'vitest'

describe('getRuntimeConfig', () => {
  afterEach(() => vi.restoreAllMocks())

  it('requests the same-origin no-store route handler', async () => {
    const config = { auth: { approvalRequired: true }, brokers: {}, strategies: {} }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(config))
    const { getRuntimeConfig } = await import('./index')

    await expect(getRuntimeConfig()).resolves.toEqual(config)
    expect(fetchMock).toHaveBeenCalledWith('/api/runtime-config', expect.objectContaining({ cache: 'no-store' }))
  })
})
