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

describe('단건 create — shareToGroup 쿼리', () => {
  beforeEach(() => {
    clientFetchMock.mockReset()
    apiFetchMock.mockReset()
  })

  it('shareToGroup 미지정이면 쿼리 없이 POST 한다', async () => {
    clientFetchMock.mockResolvedValueOnce({ id: 'b1', amount: 1000 })

    const { createFinanceBudget } = await import('./index')
    await createFinanceBudget({ categoryId: 'c1', applyStartDate: '2026-01-01', amount: 1000 })

    expect(clientFetchMock).toHaveBeenCalledWith(
      '/api/finance/budgets',
      { method: 'POST', body: JSON.stringify({ categoryId: 'c1', applyStartDate: '2026-01-01', amount: 1000 }) },
    )
  })

  it('shareToGroup:true 면 ?shareToGroup=true 를 붙인다', async () => {
    clientFetchMock.mockResolvedValueOnce({ id: 't1', amount: 1000 })

    const { createFinanceTransaction } = await import('./index')
    await createFinanceTransaction({ categoryId: 'c1', transactionDate: '2026-01-01', amount: 1000 }, { shareToGroup: true })

    expect(clientFetchMock).toHaveBeenCalledWith(
      '/api/finance/transactions?shareToGroup=true',
      { method: 'POST', body: JSON.stringify({ categoryId: 'c1', transactionDate: '2026-01-01', amount: 1000 }) },
    )
  })

  it.each([
    ['createAssetSnapshot', '/api/finance/asset-snapshots'],
    ['createFinanceAccount', '/api/finance/accounts'],
    ['createFinanceCategory', '/api/finance/categories'],
  ])('%s 도 shareToGroup:true 면 같은 쿼리를 붙인다', async (fnName, path) => {
    clientFetchMock.mockResolvedValueOnce({ id: 'x1' })

    const mod = await import('./index')
    await (mod as Record<string, (d: unknown, o: unknown) => Promise<unknown>>)[fnName]({ nickname: 'x' }, { shareToGroup: true })

    expect(clientFetchMock).toHaveBeenCalledWith(
      `${path}?shareToGroup=true`,
      { method: 'POST', body: JSON.stringify({ nickname: 'x' }) },
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
