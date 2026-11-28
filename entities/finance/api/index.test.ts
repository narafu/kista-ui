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
    apiFetchMock.mockResolvedValueOnce({ items: snapshots })

    const { listAssetSnapshots } = await import('./index')
    const result = await listAssetSnapshots({ month: '2026-08', token: 'token-abc' })

    expect(apiFetchMock).toHaveBeenCalledWith('/api/finance/asset-snapshots?month=2026-08', { method: 'GET' }, 'token-abc')
    expect(clientFetchMock).not.toHaveBeenCalled()
    expect(result).toBe(snapshots)
  })

  it('routes through the client proxy when no token is given (Client Component)', async () => {
    clientFetchMock.mockResolvedValueOnce({ items: [] })

    const { listAssetSnapshots } = await import('./index')
    await listAssetSnapshots({ month: '2026-08' })

    expect(clientFetchMock).toHaveBeenCalledWith('/api/finance/asset-snapshots?month=2026-08', { method: 'GET' })
    expect(apiFetchMock).not.toHaveBeenCalled()
  })
})

describe('listFinanceTransactions', () => {
  beforeEach(() => {
    clientFetchMock.mockReset()
    apiFetchMock.mockReset()
  })

  it('필터·정렬·커서를 쿼리로 보내고 items에 amount 기본값을 채운다', async () => {
    clientFetchMock.mockResolvedValueOnce({ items: [{ id: 't1', categoryId: 'c1', transactionDate: '2026-08-01' }], nextCursor: 'cur', hasMore: true })

    const { listFinanceTransactions } = await import('./index')
    const page = await listFinanceTransactions({
      from: '2026-08-01',
      to: '2026-08-31',
      type: 'EXPENSE',
      categoryId: 'c1',
      memo: '점심',
      sort: 'amount,desc',
      cursor: 'prev',
      size: 50,
    })

    const [url] = clientFetchMock.mock.calls[0] as [string]
    const params = new URL(url, 'http://x').searchParams
    expect(url.startsWith('/api/finance/transactions?')).toBe(true)
    expect(Object.fromEntries(params)).toEqual({
      from: '2026-08-01', to: '2026-08-31', type: 'EXPENSE', categoryId: 'c1', memo: '점심', sort: 'amount,desc', cursor: 'prev', size: '50',
    })
    expect(page).toEqual({ items: [{ id: 't1', categoryId: 'c1', transactionDate: '2026-08-01', amount: 0 }], nextCursor: 'cur', hasMore: true })
  })
})

describe('listFinanceCategories', () => {
  beforeEach(() => {
    clientFetchMock.mockReset()
  })

  it('items 봉투를 풀어 배열을 돌려준다', async () => {
    clientFetchMock.mockResolvedValueOnce({ items: [{ id: 'c1' }] })

    const { listFinanceCategories } = await import('./index')

    expect(await listFinanceCategories('INCOME')).toEqual([{ id: 'c1' }])
    expect(clientFetchMock).toHaveBeenCalledWith('/api/finance/categories?type=INCOME', { method: 'GET' })
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

describe('서버 집계 조회', () => {
  beforeEach(() => {
    clientFetchMock.mockReset()
  })

  it('기간 모드를 서버 enum으로 바꾸고 range를 생략하면(전체) 쿼리에서 뺀다', async () => {
    clientFetchMock.mockResolvedValue({ points: [] })
    const { getFlowTrend } = await import('./index')

    await getFlowTrend({ type: 'EXPENSE', period: { month: '2026-08', mode: 'yearly' } })
    await getFlowTrend({ type: 'EXPENSE', period: { month: '2026-08', mode: 'monthly' }, range: 12 })

    expect(clientFetchMock.mock.calls[0][0]).toBe('/api/finance/transactions/trend?type=EXPENSE&mode=YEARLY&month=2026-08')
    expect(clientFetchMock.mock.calls[1][0]).toBe('/api/finance/transactions/trend?type=EXPENSE&mode=MONTHLY&month=2026-08&range=12')
  })

  it('일괄 등록 미리보기의 null 필드를 undefined로 정규화한다(등록 요청에 null을 싣지 않게)', async () => {
    clientFetchMock.mockResolvedValueOnce({
      asset: [],
      income: [{
        id: 'root', name: '월급', sortOrder: 0, items: [],
        children: [{
          id: 'leaf', name: '기본급', sortOrder: 0, children: [],
          items: [{
            id: 't1', categoryId: 'leaf', categoryName: '기본급', categoryPath: [], memo: null, amount: 100,
            assetClass: null, market: null, strategy: null, accountId: null, accountName: null, accountInstitution: null, accountOwner: null,
          }],
        }],
      }],
      expense: [],
      saving: [],
    })
    const { getBulkRegisterPreview } = await import('./index')

    const preview = await getBulkRegisterPreview('2026-07')

    expect(clientFetchMock.mock.calls[0][0]).toBe('/api/finance/bulk-register/preview?sourceMonth=2026-07')
    const item = preview.income[0].children[0].items[0]
    expect(Object.values(item)).not.toContain(null)
    expect(item).toMatchObject({ id: 't1', memo: undefined, amount: 100 })
  })
})
