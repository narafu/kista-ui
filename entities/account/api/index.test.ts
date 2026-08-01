import { describe, expect, it, vi, beforeEach } from 'vitest'

const clientFetchMock = vi.fn()
const apiFetchMock = vi.fn()

vi.mock('@shared/lib/api-client', () => ({
  clientFetch: (...args: unknown[]) => clientFetchMock(...args),
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
  fetchEither: (path: string, options: unknown, token?: string) =>
    token ? apiFetchMock(path, options, token) : clientFetchMock(path, options),
  jsonBody: (method: string, body: unknown) => ({ method, body: JSON.stringify(body) }),
}))

describe('listAccounts', () => {
  beforeEach(() => {
    clientFetchMock.mockReset()
    apiFetchMock.mockReset()
  })

  it('calls kista-api directly with the token when provided (Server Component)', async () => {
    const accounts = [{ id: 'a1', nickname: 'Main', accountNoMasked: '111-***', broker: 'MOCK' }]
    apiFetchMock.mockResolvedValueOnce(accounts)

    const { listAccounts } = await import('./index')
    const result = await listAccounts('token-abc')

    expect(apiFetchMock).toHaveBeenCalledWith('/api/accounts', { method: 'GET' }, 'token-abc')
    expect(clientFetchMock).not.toHaveBeenCalled()
    expect(result).toBe(accounts)
  })

  it('routes through the client proxy when no token is given (Client Component)', async () => {
    const accounts = [{ id: 'a1', nickname: 'Main', accountNoMasked: '111-***', broker: 'MOCK' }]
    clientFetchMock.mockResolvedValueOnce(accounts)

    const { listAccounts } = await import('./index')
    const result = await listAccounts()

    expect(clientFetchMock).toHaveBeenCalledWith('/api/accounts', { method: 'GET' })
    expect(apiFetchMock).not.toHaveBeenCalled()
    expect(result).toBe(accounts)
  })
})
