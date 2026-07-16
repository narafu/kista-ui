import { describe, expect, it, vi, beforeEach } from 'vitest'

const fetchEitherMock = vi.fn()
const apiFetchMock = vi.fn()

vi.mock('@shared/lib/api-client', () => ({
  fetchEither: (...args: unknown[]) => fetchEitherMock(...args),
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}))

describe('trade api', () => {
  beforeEach(() => {
    fetchEitherMock.mockReset()
    apiFetchMock.mockReset()
  })

  it('getAccountCycleHistory builds full query string with from/to/cursor/size', async () => {
    const { getAccountCycleHistory } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({ items: [], nextCursor: null, hasMore: false })

    await getAccountCycleHistory('account-1', { from: '2026-01-01', to: '2026-02-01', cursor: 'abc', size: 20 }, 'token-1')

    expect(fetchEitherMock).toHaveBeenCalledWith(
      '/api/accounts/account-1/cycle-history?from=2026-01-01&to=2026-02-01&cursor=abc&size=20',
      { method: 'GET' },
      'token-1'
    )
  })

  it('getAccountCycleHistory omits query string when no params given', async () => {
    const { getAccountCycleHistory } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({ items: [], nextCursor: null, hasMore: false })

    await getAccountCycleHistory('account-1', {}, undefined)

    expect(fetchEitherMock).toHaveBeenCalledWith('/api/accounts/account-1/cycle-history', { method: 'GET' }, undefined)
  })

  it('getStrategyCycleHistory targets trading-cycles history endpoint', async () => {
    const { getStrategyCycleHistory } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({ items: [], nextCursor: null, hasMore: false })

    await getStrategyCycleHistory('strategy-1', { from: '2026-01-01' })

    expect(fetchEitherMock).toHaveBeenCalledWith(
      '/api/trading-cycles/strategy-1/history?from=2026-01-01',
      { method: 'GET' },
      undefined
    )
  })

  it('getAccountPortfolio uses apiFetch (Server Component, requires token)', async () => {
    const { getAccountPortfolio } = await import('./index')
    const summary = { positions: [], summary: {} }
    apiFetchMock.mockResolvedValueOnce(summary)

    const result = await getAccountPortfolio('account-1', 'token-1')

    expect(apiFetchMock).toHaveBeenCalledWith('/api/accounts/account-1/portfolio', { method: 'GET' }, 'token-1')
    expect(result).toBe(summary)
  })

  it('getDailyTransactionsBatch builds date-range query for the user-scoped batch endpoint', async () => {
    const { getDailyTransactionsBatch } = await import('./index')
    const batch = { items: [], summary: { buyAmountFcr: 0, sellAmountFcr: 0, domesticFee: 0, overseasFee: 0 } }
    fetchEitherMock.mockResolvedValueOnce(batch)

    const result = await getDailyTransactionsBatch({ from: '2026-01-01', to: '2026-01-31' }, 'token-1')

    expect(fetchEitherMock).toHaveBeenCalledWith(
      '/api/daily-trades?from=2026-01-01&to=2026-01-31',
      { method: 'GET' },
      'token-1'
    )
    expect(result).toBe(batch)
  })

  it('does not normalize response payloads — raw BigDecimal strings pass through untouched', async () => {
    const { getAccountPortfolio } = await import('./index')
    const raw = { summary: { totalAssetUsd: '1234.56', totalEvalProfit: '12.30' } }
    apiFetchMock.mockResolvedValueOnce(raw)

    const result = await getAccountPortfolio('account-1', 'token-1')

    expect(result.summary?.totalAssetUsd).toBe('1234.56')
  })
})
