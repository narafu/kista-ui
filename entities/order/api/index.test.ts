import { describe, expect, it, vi, beforeEach } from 'vitest'

const clientFetchMock = vi.fn()
const apiFetchMock = vi.fn()

vi.mock('@shared/lib/api-client', () => ({
  clientFetch: (...args: unknown[]) => clientFetchMock(...args),
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
  fetchEither: (path: string, options: unknown, token?: string) =>
    token ? apiFetchMock(path, options, token) : clientFetchMock(path, options),
}))

describe('order api', () => {
  beforeEach(() => {
    clientFetchMock.mockReset()
    apiFetchMock.mockReset()
  })

  it('getStrategyOrdersPreview normalizes orders/position and defaults optional fields', async () => {
    const { getStrategyOrdersPreview } = await import('./index')
    clientFetchMock.mockResolvedValueOnce({
      tradeDate: '2026-01-01',
      position: {
        ticker: 'TQQQ',
        holdings: 10,
        averagePrice: '20.50',
        usdDeposit: '100.00',
        totalAssets: '300.00',
        priceOffsetRate: '5.00',
        currentRound: 3,
        unitAmount: '50.00',
        referencePrice: '19.00',
        targetPrice: '21.00',
      },
      orders: [
        { ticker: 'TQQQ', orderType: 'LOC', direction: 'BUY', quantity: '5', price: '20.00' },
      ],
    })

    const result = await getStrategyOrdersPreview('strategy-1')

    expect(clientFetchMock).toHaveBeenCalledWith('/api/trading-cycles/strategy-1/preview', { method: 'GET' })
    expect(result.orders[0]).toEqual({
      ticker: 'TQQQ',
      orderType: 'LOC',
      direction: 'BUY',
      quantity: 5,
      price: '20.00',
    })
    expect(result.position?.holdings).toBe(10)
    expect(result.skipReason).toBeNull()
    expect(result.todayOrders).toEqual([])
    expect(result.otherStrategiesPlannedBuyUsd).toBe('0')
  })

  it('getStrategyOrdersPreview passes through null position and present skipReason/todayOrders', async () => {
    const { getStrategyOrdersPreview } = await import('./index')
    clientFetchMock.mockResolvedValueOnce({
      tradeDate: '2026-01-01',
      position: null,
      orders: [],
      skipReason: 'NO_CYCLE_HISTORY',
      todayOrders: [
        { id: 'order-1', ticker: 'TQQQ', direction: 'BUY', orderType: 'LOC', quantity: 3, price: '20.00', status: 'PLACED' },
      ],
      otherStrategiesPlannedBuyUsd: '150.00',
    })

    const result = await getStrategyOrdersPreview('strategy-1')

    expect(result.position).toBeNull()
    expect(result.skipReason).toBe('NO_CYCLE_HISTORY')
    expect(result.todayOrders).toEqual([
      { id: 'order-1', ticker: 'TQQQ', direction: 'BUY', orderType: 'LOC', quantity: 3, price: '20.00', status: 'PLACED' },
    ])
    expect(result.otherStrategiesPlannedBuyUsd).toBe('150.00')
  })

  it('getStrategyOrdersPreview calls kista-api directly with the token when provided (Server Component prefetch)', async () => {
    const { getStrategyOrdersPreview } = await import('./index')
    apiFetchMock.mockResolvedValueOnce({
      tradeDate: '2026-01-01',
      position: null,
      orders: [],
      skipReason: null,
      todayOrders: [],
      otherStrategiesPlannedBuyUsd: '0',
    })

    const result = await getStrategyOrdersPreview('strategy-1', 'token-abc')

    expect(apiFetchMock).toHaveBeenCalledWith('/api/trading-cycles/strategy-1/preview', { method: 'GET' }, 'token-abc')
    expect(clientFetchMock).not.toHaveBeenCalled()
    expect(result.tradeDate).toBe('2026-01-01')
  })

  it('cancelAllOrders issues DELETE to the trading-cycles execute endpoint', async () => {
    const { cancelAllOrders } = await import('./index')
    const summary = { cancelledCount: 2, failedCount: 0 }
    clientFetchMock.mockResolvedValueOnce(summary)

    const result = await cancelAllOrders('strategy-1')

    expect(clientFetchMock).toHaveBeenCalledWith('/api/trading-cycles/strategy-1/execute', { method: 'DELETE' })
    expect(result).toBe(summary)
  })

  it('cancelOneOrder issues DELETE to the single order endpoint', async () => {
    const { cancelOneOrder } = await import('./index')
    clientFetchMock.mockResolvedValueOnce(undefined)

    await cancelOneOrder('order-1')

    expect(clientFetchMock).toHaveBeenCalledWith('/api/orders/order-1', { method: 'DELETE' })
  })

  it('listStrategyOrders builds from/to query only when provided and normalizes items', async () => {
    const { listStrategyOrders } = await import('./index')
    clientFetchMock.mockResolvedValueOnce({
      orders: [
        { id: 'o1', tradeDate: '2026-01-01', direction: 'BUY', orderType: 'LOC', quantity: 5, price: '20.00', status: 'FILLED', filledQuantity: 5, filledPrice: '20.00' },
        { id: 'o2', tradeDate: '2026-01-02', direction: 'SELL', orderType: 'MOC', quantity: 3, price: '21.00', status: 'PLANNED', filledQuantity: null, filledPrice: null },
      ],
    })

    const result = await listStrategyOrders('strategy-1', '2026-01-01', '2026-01-31')

    expect(clientFetchMock).toHaveBeenCalledWith('/api/trading-cycles/strategy-1/orders?from=2026-01-01&to=2026-01-31')
    expect(result[0].filledQuantity).toBe(5)
    expect(result[1].filledQuantity).toBeNull()
    expect(result[1].filledPrice).toBeNull()
  })

  it('listStrategyOrders omits query string when no date range given', async () => {
    const { listStrategyOrders } = await import('./index')
    clientFetchMock.mockResolvedValueOnce({ orders: [] })

    await listStrategyOrders('strategy-1')

    expect(clientFetchMock).toHaveBeenCalledWith('/api/trading-cycles/strategy-1/orders')
  })

  it('normalizes a null competition field to null', async () => {
    const { getStrategyOrdersPreview } = await import('./index')
    clientFetchMock.mockResolvedValueOnce({
      tradeDate: '2026-07-18',
      position: null,
      orders: [],
      skipReason: 'NO_CYCLE_HISTORY',
      todayOrders: [],
      otherStrategiesPlannedBuyUsd: '0',
      competition: null,
    })

    const result = await getStrategyOrdersPreview('strategy-1')

    expect(result.competition).toBeNull()
  })

  it('normalizes a populated competition field including nested competing strategies', async () => {
    const { getStrategyOrdersPreview } = await import('./index')
    clientFetchMock.mockResolvedValueOnce({
      tradeDate: '2026-07-18',
      position: null,
      orders: [],
      skipReason: null,
      todayOrders: [],
      otherStrategiesPlannedBuyUsd: '0',
      competition: {
        sufficientBudget: false,
        availableDeposit: 1000,
        requiredForThisStrategy: 200,
        consumedByHigherPriority: 900,
        blockedByHigherPriority: [
          { strategyId: 'vr-1', type: 'VR', ticker: 'TQQQ', requiredBuyUsd: 900, priority: 0 },
        ],
        uncertainStrategyIds: ['privacy-1'],
        liveBalanceUnavailable: true,
      },
    })

    const result = await getStrategyOrdersPreview('strategy-1')

    expect(result.competition).toEqual({
      sufficientBudget: false,
      availableDeposit: '1000',
      requiredForThisStrategy: '200',
      consumedByHigherPriority: '900',
      blockedByHigherPriority: [
        { strategyId: 'vr-1', type: 'VR', ticker: 'TQQQ', requiredBuyUsd: '900', priority: 0 },
      ],
      uncertainStrategyIds: ['privacy-1'],
      liveBalanceUnavailable: true,
    })
  })
})
