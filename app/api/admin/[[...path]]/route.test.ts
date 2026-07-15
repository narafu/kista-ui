import { describe, expect, it, vi } from 'vitest'

const { getMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(async () => Response.json({ enabled: true })),
  putMock: vi.fn(async (request: Request) => Response.json({ method: request.method, body: await request.json() })),
}))

vi.mock('@shared/lib/proxy/createProxyRoute', () => ({
  createProxyRoute: vi.fn(() => ({ GET: getMock, POST: vi.fn(), PUT: putMock, PATCH: vi.fn(), DELETE: vi.fn() })),
}))

describe('/api/admin proxy route', () => {
  it('exports PUT and forwards its method and JSON body', async () => {
    const { PUT } = await import('./route')
    const request = new Request('https://kista.test/api/admin/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: true }),
    })
    const response = await PUT(request as never, { params: Promise.resolve({ path: ['settings'] }) })
    await expect(response.json()).resolves.toEqual({ method: 'PUT', body: { enabled: true } })
    expect(putMock).toHaveBeenCalledWith(request, expect.any(Object))
  })

  it.each(['GET', 'PUT'] as const)('sets no-store on the browser-facing settings %s response', async (method) => {
    const handlers = await import('./route')
    const request = new Request('https://kista.test/api/admin/settings', {
      method,
      headers: method === 'PUT' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'PUT' ? JSON.stringify({ enabled: true }) : undefined,
    })
    const response = await handlers[method](request as never, { params: Promise.resolve({ path: ['settings'] }) })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})
