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

  it('getEquityCurve builds full query string with from/to/benchmark', async () => {
    const { getEquityCurve } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({ points: [], benchmark: [] })

    await getEquityCurve({ from: '2026-04-01', to: '2026-07-01', benchmark: 'QLD' })

    expect(fetchEitherMock).toHaveBeenCalledWith(
      '/api/stats/equity-curve?from=2026-04-01&to=2026-07-01&benchmark=QLD',
      { method: 'GET' },
      undefined
    )
  })

  it('getEquityCurve omits from/to when not given', async () => {
    const { getEquityCurve } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({ points: [], benchmark: [] })

    await getEquityCurve({ benchmark: 'SPY' })

    expect(fetchEitherMock).toHaveBeenCalledWith(
      '/api/stats/equity-curve?benchmark=SPY',
      { method: 'GET' },
      undefined
    )
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
})
