import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchEitherMock, clientFetchMock } = vi.hoisted(() => ({
  fetchEitherMock: vi.fn(),
  clientFetchMock: vi.fn(),
}))

vi.mock('@shared/lib/api-client', () => ({
  fetchEither: fetchEitherMock,
  clientFetch: clientFetchMock,
  jsonBody: (method: string, body: unknown) => ({ method, body: JSON.stringify(body) }),
}))

describe('admin settings API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads settings through the admin proxy', async () => {
    const { getAdminSettings } = await import('./index')
    await getAdminSettings('token')
    expect(fetchEitherMock).toHaveBeenCalledWith('/api/admin/settings', { cache: 'no-store' }, 'token')
  })

  it('updates the complete settings document', async () => {
    const settings = { auth: { approvalRequired: true } }
    const { updateAdminSettings } = await import('./index')
    await updateAdminSettings(settings as never)
    expect(clientFetchMock).toHaveBeenCalledWith('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  })
})
