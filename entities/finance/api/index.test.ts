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

describe('listAssetSnapshots', () => {
  beforeEach(() => {
    clientFetchMock.mockReset()
    apiFetchMock.mockReset()
  })

  it('calls kista-api directly with the token when provided (Server Component)', async () => {
    const snapshots = [{
      id: 's1',
      categoryId: 'f1000000-0000-4000-8000-000000000403',
      rootCategoryId: 'f1000000-0000-4000-8000-000000000403',
      categoryName: '투자',
      entryDate: '2026-08-01',
      assetClass: 'EQUITY',
      market: 'GLOBAL',
      amount: 1000000,
    }]
    apiFetchMock.mockResolvedValueOnce(snapshots)

    const { listAssetSnapshots } = await import('./index')
    const result = await listAssetSnapshots({ token: 'token-abc' })

    expect(apiFetchMock).toHaveBeenCalledWith('/api/finance/asset-snapshots', { method: 'GET' }, 'token-abc')
    expect(clientFetchMock).not.toHaveBeenCalled()
    expect(result).toBe(snapshots)
  })

  it('routes through the client proxy when no token is given (Client Component)', async () => {
    clientFetchMock.mockResolvedValueOnce([])

    const { listAssetSnapshots } = await import('./index')
    await listAssetSnapshots()

    expect(clientFetchMock).toHaveBeenCalledWith('/api/finance/asset-snapshots', { method: 'GET' })
    expect(apiFetchMock).not.toHaveBeenCalled()
  })

  it('forwards groupId as a query param when given', async () => {
    clientFetchMock.mockResolvedValueOnce([])

    const { listAssetSnapshots } = await import('./index')
    await listAssetSnapshots({ groupId: 'group-1' })

    expect(clientFetchMock).toHaveBeenCalledWith('/api/finance/asset-snapshots?groupId=group-1', { method: 'GET' })
  })
})

describe('bulkRegisterFinance', () => {
  beforeEach(() => {
    clientFetchMock.mockReset()
    apiFetchMock.mockReset()
  })

  it('POST /api/finance/bulk-register 로 배치 등록 요청을 보낸다', async () => {
    clientFetchMock.mockResolvedValueOnce({ assetSuccessCount: 1, transactionSuccessCount: 2, failures: [] })

    const { bulkRegisterFinance } = await import('./index')
    const result = await bulkRegisterFinance({ assets: [], transactions: [] })

    expect(clientFetchMock).toHaveBeenCalledWith(
      '/api/finance/bulk-register',
      { method: 'POST', body: JSON.stringify({ assets: [], transactions: [] }) },
    )
    expect(result.assetSuccessCount).toBe(1)
  })

  it('shareToGroup:true 면 ?shareToGroup=true 쿼리를 붙인다 (대상 그룹은 서버가 해석)', async () => {
    clientFetchMock.mockResolvedValueOnce({ assetSuccessCount: 0, transactionSuccessCount: 0, failures: [] })

    const { bulkRegisterFinance } = await import('./index')
    await bulkRegisterFinance({ assets: [], transactions: [] }, { shareToGroup: true })

    expect(clientFetchMock).toHaveBeenCalledWith(
      '/api/finance/bulk-register?shareToGroup=true',
      { method: 'POST', body: JSON.stringify({ assets: [], transactions: [] }) },
    )
  })
})

describe('setMonthlyClosing', () => {
  beforeEach(() => {
    clientFetchMock.mockReset()
    apiFetchMock.mockReset()
  })

  it('PATCHes to the month-scoped route with a completed body', async () => {
    clientFetchMock.mockResolvedValueOnce({ month: '2026-08', completed: true })

    const { setMonthlyClosing } = await import('./index')
    await setMonthlyClosing('2026-08', true)

    expect(clientFetchMock).toHaveBeenCalledWith(
      '/api/finance/monthly-closings/2026-08',
      { method: 'PATCH', body: JSON.stringify({ completed: true }) },
    )
  })
})
