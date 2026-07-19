import { describe, expect, it, vi } from 'vitest'

const { createProxyRouteMock, getMock } = vi.hoisted(() => ({
  createProxyRouteMock: vi.fn(() => ({ GET: vi.fn(async () => Response.json({ ok: true })) })),
  getMock: vi.fn(),
}))

vi.mock('@shared/lib/proxy/createProxyRoute', () => ({
  createProxyRoute: createProxyRouteMock,
}))

describe('/api/stats proxy route', () => {
  it('proxies stats requests to kista-api under /api/stats', async () => {
    createProxyRouteMock.mockReturnValueOnce({ GET: getMock })

    const { GET } = await import('./route')

    expect(createProxyRouteMock).toHaveBeenCalledWith({ basePath: '/api/stats' })
    expect(GET).toBe(getMock)
  })

  it('exposes the housing benchmark subpath and its query parameters to the proxy handler', async () => {
    createProxyRouteMock.mockReturnValueOnce({ GET: getMock })

    const { GET } = await import('./route')
    const request = new Request(
      'https://kista.test/api/stats/housing-benchmark?scope=PORTFOLIO&quintile=3&from=2021-07-01&to=2026-07-01'
    )
    const context = { params: Promise.resolve({ path: ['housing-benchmark'] }) }

    await GET(request as never, context)

    expect(getMock).toHaveBeenCalledWith(request, context)
  })
})
