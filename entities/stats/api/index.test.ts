import { describe, expect, it, vi, beforeEach } from 'vitest'

const fetchEitherMock = vi.fn()

vi.mock('@shared/lib/api-client', () => ({
  fetchEither: (...args: unknown[]) => fetchEitherMock(...args),
}))

describe('stats api', () => {
  beforeEach(() => {
    fetchEitherMock.mockReset()
  })

  it('getStatsSummary calls the summary endpoint', async () => {
    const { getStatsSummary } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({
      totalRealizedPnl: 0,
      totalUnrealizedPnl: 0,
      activePrincipal: 0,
      byType: [],
    })

    await getStatsSummary('token-1')

    expect(fetchEitherMock).toHaveBeenCalledWith('/api/stats/summary', { method: 'GET' }, 'token-1')
  })

  it('getEquityCurve builds query string with from/to only', async () => {
    const { getEquityCurve } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({ points: [] })

    await getEquityCurve({ from: '2026-04-01', to: '2026-07-01' })

    expect(fetchEitherMock).toHaveBeenCalledWith(
      '/api/stats/equity-curve?from=2026-04-01&to=2026-07-01',
      { method: 'GET' },
      undefined
    )
  })

  it('getEquityCurve includes type when given', async () => {
    const { getEquityCurve } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({ points: [] })

    await getEquityCurve({ from: '2026-04-01', to: '2026-07-01', type: 'INFINITE' })

    expect(fetchEitherMock).toHaveBeenCalledWith(
      '/api/stats/equity-curve?from=2026-04-01&to=2026-07-01&type=INFINITE',
      { method: 'GET' },
      undefined
    )
  })

  it('getEquityCurve omits from/to when not given', async () => {
    const { getEquityCurve } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({ points: [] })

    await getEquityCurve({})

    expect(fetchEitherMock).toHaveBeenCalledWith('/api/stats/equity-curve', { method: 'GET' }, undefined)
  })

  it('getStatsCycles builds type/cursor/size query string', async () => {
    const { getStatsCycles } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({ items: [], nextCursor: null, hasMore: false })

    await getStatsCycles({ type: 'INFINITE', cursor: '2026-02-01T00:00:00Z', size: 20 })

    expect(fetchEitherMock).toHaveBeenCalledWith(
      '/api/stats/cycles?type=INFINITE&cursor=2026-02-01T00%3A00%3A00Z&size=20',
      { method: 'GET' },
      undefined
    )
  })

  it('getStatsCycles omits query string when no params given', async () => {
    const { getStatsCycles } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({ items: [], nextCursor: null, hasMore: false })

    await getStatsCycles({})

    expect(fetchEitherMock).toHaveBeenCalledWith('/api/stats/cycles', { method: 'GET' }, undefined)
  })

  it('getHousingBenchmarkComparison forwards every HOUSING filter and token without symbol', async () => {
    const { getHousingBenchmarkComparison } = await import('./index')
    const response = {
      scope: 'PORTFOLIO',
      points: [{
        baseDate: '2026-07-01',
        investmentIndexUsd: 103.2,
        benchmarkIndex: 101.4,
        investmentPeriodReturn: 3.2,
        benchmarkPeriodReturn: 1.4,
      }],
      currentExchangeRate: {
        midRate: 1365.2,
        fetchedAt: '2026-07-19T01:30:00Z',
        source: 'TOSS_INVEST',
      },
    }
    fetchEitherMock.mockResolvedValueOnce(response)

    await expect(getHousingBenchmarkComparison({
      scope: 'PORTFOLIO',
      strategyId: 'strategy-1',
      benchmarkType: 'HOUSING',
      quintile: 3,
      from: '2021-07-01',
      to: '2026-07-01',
    }, 'token-1')).resolves.toEqual(response)

    const [calledUrl] = fetchEitherMock.mock.calls[0]
    expect(calledUrl).toBe(
      '/api/stats/housing-benchmark?scope=PORTFOLIO&benchmarkType=HOUSING&strategyId=strategy-1&quintile=3&from=2021-07-01&to=2026-07-01'
    )
    expect(calledUrl).not.toContain('symbol=')
    expect(fetchEitherMock).toHaveBeenCalledWith(calledUrl, { method: 'GET' }, 'token-1')
  })

  it('getHousingBenchmarkComparison forwards every ETF filter and token without quintile', async () => {
    const { getHousingBenchmarkComparison } = await import('./index')
    const response = {
      scope: 'PORTFOLIO',
      points: [],
      currentExchangeRate: null,
    }
    fetchEitherMock.mockResolvedValueOnce(response)

    await expect(getHousingBenchmarkComparison({
      scope: 'PORTFOLIO',
      strategyId: 'strategy-1',
      benchmarkType: 'ETF',
      symbol: 'QLD',
      from: '2021-07-01',
      to: '2026-07-01',
    }, 'token-1')).resolves.toEqual(response)

    const [calledUrl] = fetchEitherMock.mock.calls[0]
    expect(calledUrl).toBe(
      '/api/stats/housing-benchmark?scope=PORTFOLIO&benchmarkType=ETF&strategyId=strategy-1&symbol=QLD&from=2021-07-01&to=2026-07-01'
    )
    expect(calledUrl).not.toContain('quintile=')
    expect(fetchEitherMock).toHaveBeenCalledWith(calledUrl, { method: 'GET' }, 'token-1')
  })

  it('getHousingBenchmarkComparison preserves a null current exchange rate', async () => {
    const { getHousingBenchmarkComparison } = await import('./index')
    const response = {
      scope: 'PORTFOLIO',
      points: [],
      currentExchangeRate: null,
    }
    fetchEitherMock.mockResolvedValueOnce(response)

    await expect(getHousingBenchmarkComparison({
      scope: 'PORTFOLIO',
      benchmarkType: 'HOUSING',
      quintile: 3,
    })).resolves.toEqual(response)
  })
})
