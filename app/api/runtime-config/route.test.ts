import { describe, expect, it, vi } from 'vitest'

const { createProxyRouteMock } = vi.hoisted(() => ({
  createProxyRouteMock: vi.fn(() => ({ GET: vi.fn(async () => Response.json({ ok: true })) })),
}))

vi.mock('@shared/lib/proxy/createProxyRoute', () => ({ createProxyRoute: createProxyRouteMock }))

describe('/api/runtime-config route', () => {
  it('allows unauthenticated access to the public backend endpoint', async () => {
    await import('./route')
    expect(createProxyRouteMock).toHaveBeenCalledWith({
      basePath: '/api/runtime-config',
      requireAuth: false,
    })
  })

  it('preserves no-store on the public response', async () => {
    const { GET } = await import('./route')
    const response = await GET({} as never)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})
