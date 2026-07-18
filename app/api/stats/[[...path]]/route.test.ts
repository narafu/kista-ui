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
})
