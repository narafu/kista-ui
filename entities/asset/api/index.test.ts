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

describe('listAssets', () => {
  beforeEach(() => {
    clientFetchMock.mockReset()
    apiFetchMock.mockReset()
  })

  it('calls kista-api directly with the token when provided (Server Component)', async () => {
    const assets = [{ id: 'a1', entryDate: '2026-08-01', category: 'INVESTMENT', subcategory: '일반계좌', assetClass: '미국주식', amount: 1000000 }]
    apiFetchMock.mockResolvedValueOnce(assets)

    const { listAssets } = await import('./index')
    const result = await listAssets('token-abc')

    expect(apiFetchMock).toHaveBeenCalledWith('/api/assets', { method: 'GET' }, 'token-abc')
    expect(clientFetchMock).not.toHaveBeenCalled()
    expect(result).toBe(assets)
  })

  it('routes through the client proxy when no token is given (Client Component)', async () => {
    clientFetchMock.mockResolvedValueOnce([])

    const { listAssets } = await import('./index')
    await listAssets()

    expect(clientFetchMock).toHaveBeenCalledWith('/api/assets', { method: 'GET' })
    expect(apiFetchMock).not.toHaveBeenCalled()
  })
})

describe('setAssetMonthlyCheck', () => {
  beforeEach(() => {
    clientFetchMock.mockReset()
    apiFetchMock.mockReset()
  })

  it('PUTs to the month-scoped route with a completed body', async () => {
    clientFetchMock.mockResolvedValueOnce({ month: '2026-08', completed: true })

    const { setAssetMonthlyCheck } = await import('./index')
    await setAssetMonthlyCheck('2026-08', true)

    expect(clientFetchMock).toHaveBeenCalledWith(
      '/api/asset-monthly-checks/2026-08',
      { method: 'PUT', body: JSON.stringify({ completed: true }) },
    )
  })
})
