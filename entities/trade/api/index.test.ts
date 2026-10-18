import { describe, expect, it, vi, beforeEach } from 'vitest'

const fetchEitherMock = vi.fn()

vi.mock('@shared/lib/api-client', () => ({
  fetchEither: (...args: unknown[]) => fetchEitherMock(...args),
}))

describe('trade api', () => {
  beforeEach(() => {
    fetchEitherMock.mockReset()
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

  it('getAccountPortfolio routes through fetchEither so Server and Client Components share it', async () => {
    const { getAccountPortfolio } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({ positions: [], summary: {} })

    const result = await getAccountPortfolio('account-1', 'token-1')

    expect(fetchEitherMock).toHaveBeenCalledWith('/api/accounts/account-1/portfolio', { method: 'GET' }, 'token-1')
    expect(result.positions).toEqual([])
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

  it('getAccountPortfolio normalizes KIS BigDecimal strings to numbers', async () => {
    const { getAccountPortfolio } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({
      positions: [
        {
          ticker: 'TQQQ',
          holdings: 4,
          exchangeCode: 'NASD',
          avgPrice: '312.45',
          currentPrice: 320.1,
          evalAmountUsd: '1280.40',
          profitLossUsd: null,
          profitRate: '2.45',
        },
      ],
      summary: {
        totalAssetUsd: '1234.56',
        totalEvalProfit: 12.3,
        totalReturnRate: null,
        usdDeposit: '500.00',
        posEvalUsd: '734.56',
      },
    })

    const result = await getAccountPortfolio('account-1', 'token-1')

    expect(result.positions?.[0]).toEqual(expect.objectContaining({
      ticker: 'TQQQ',
      holdings: 4,
      avgPrice: 312.45,
      currentPrice: 320.1,
      evalAmountUsd: 1280.4,
      profitLossUsd: null,
      profitRate: 2.45,
    }))
    expect(result.summary).toEqual(expect.objectContaining({
      totalAssetUsd: 1234.56,
      totalEvalProfit: 12.3,
      totalReturnRate: null,
      usdDeposit: 500,
      posEvalUsd: 734.56,
    }))
  })

  it('getAccountPortfolio preserves null fields and tolerates an empty response', async () => {
    const { getAccountPortfolio } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({})

    const result = await getAccountPortfolio('account-1', 'token-1')

    expect(result.positions).toBeUndefined()
    expect(result.summary).toBeUndefined()
  })

  it('getCryptoPortfolio converts amounts to numbers and keeps null currentPrice', async () => {
    const { getCryptoPortfolio } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({
      krwCash: '120000',
      totalAssetKrw: 1520000,
      holdings: [
        { ticker: 'BTC', quantity: '0.01234567', avgBuyPrice: '100000000', currentPrice: 110000000, evalAmountKrw: 1358024 },
        { ticker: 'ETH', quantity: 0.5, avgBuyPrice: 5000000, currentPrice: null, evalAmountKrw: null },
      ],
    })

    const result = await getCryptoPortfolio('a1')

    expect(fetchEitherMock).toHaveBeenCalledWith('/api/accounts/a1/crypto-portfolio', { method: 'GET' }, undefined)
    expect(result.krwCash).toBe(120000)
    expect(result.holdings[0]).toEqual({ ticker: 'BTC', quantity: 0.01234567, avgBuyPrice: 100000000, currentPrice: 110000000, evalAmountKrw: 1358024 })
    expect(result.holdings[1].currentPrice).toBeNull()
    expect(result.holdings[1].evalAmountKrw).toBe(0)
  })
})
