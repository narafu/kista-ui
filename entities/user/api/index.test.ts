import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  correctAdminOrder,
  listAdminStrategies,
  listAdminStrategyOrders,
  updateAdminStrategyStatus,
} from './index'
import type {
  AdminOrderCorrectionRequest,
  AdminOrderCorrectionResponse,
  AdminStrategy,
  AdminStrategyOrder,
} from '../model/types'

const {
  apiFetchMock,
  clientFetchMock,
  jsonBodyMock,
} = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  clientFetchMock: vi.fn(),
  jsonBodyMock: vi.fn(),
}))

vi.mock('@shared/lib/api-client', () => ({
  apiFetch: apiFetchMock,
  clientFetch: clientFetchMock,
  fetchEither: vi.fn(),
  jsonBody: jsonBodyMock,
}))

describe('entities/user/api admin trade correction APIs', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
    clientFetchMock.mockReset()
    jsonBodyMock.mockReset()
    jsonBodyMock.mockImplementation((method: string, body: unknown) => ({ method, body }))
  })

  it('lists admin strategies for an account with bearer token auth', async () => {
    const strategies: AdminStrategy[] = [
      {
        id: 'strategy-1',
        type: 'PRIVACY',
        status: 'ACTIVE',
        ticker: 'SOXL',
        cycleSeedType: 'MAX',
      },
    ]
    apiFetchMock.mockResolvedValue(strategies)

    const result = await listAdminStrategies('admin-token', 'account-1')

    expect(result).toEqual(strategies)
    expect(apiFetchMock).toHaveBeenCalledWith(
      '/api/admin/accounts/account-1/strategies',
      { method: 'GET' },
      'admin-token',
    )
  })

  it('lists strategy orders for a trade date with bearer token auth', async () => {
    const orders: AdminStrategyOrder[] = [
      {
        id: 'order-1',
        userId: 'user-1',
        ownerNickname: 'privacy-user',
        strategyType: 'PRIVACY',
        tradeDate: '2026-07-01',
        ticker: 'SOXL',
        direction: 'SELL',
        orderType: 'LOC',
        timing: 'AT_CLOSE',
        quantity: 2,
        price: 267.37,
        status: 'PLACED',
        externalOrderId: 'BROKER-1',
        filledQuantity: null,
        filledPrice: null,
      },
    ]
    apiFetchMock.mockResolvedValue(orders)

    const result = await listAdminStrategyOrders('admin-token', 'account-1', 'strategy-1', '2026-07-01')

    expect(result).toEqual(orders)
    expect(apiFetchMock).toHaveBeenCalledWith(
      '/api/admin/accounts/account-1/strategies/strategy-1/orders?tradeDate=2026-07-01',
      { method: 'GET' },
      'admin-token',
    )
  })

  it('updates admin strategy status through the client route handler', async () => {
    clientFetchMock.mockResolvedValue(undefined)

    await updateAdminStrategyStatus('account-1', 'strategy-1', 'PAUSED')

    expect(jsonBodyMock).toHaveBeenCalledWith('PATCH', { status: 'PAUSED' })
    expect(clientFetchMock).toHaveBeenCalledWith(
      '/api/admin/accounts/account-1/strategies/strategy-1/status',
      { method: 'PATCH', body: { status: 'PAUSED' } },
    )
  })

  it('posts admin order corrections through the client route handler', async () => {
    const request: AdminOrderCorrectionRequest = {
      userId: 'user-1',
      accountId: 'account-1',
      strategyId: 'strategy-1',
      orderId: 'order-1',
      mode: 'PLANNED_EDIT',
      tradeDateKst: '2026-07-01',
      quantity: 3,
      price: 250,
      memo: 'price fix',
    }
    const response: AdminOrderCorrectionResponse = {
      userId: 'user-1',
      accountId: 'account-1',
      strategyId: 'strategy-1',
      orderId: 'order-1',
      mode: 'PLANNED_EDIT',
      originalStatus: 'PLANNED',
      resultingStatus: 'PLANNED',
      replacementExternalOrderId: null,
      finalHoldings: 0,
      finalAvgPrice: null,
      finalUsdDeposit: 6989,
      strategyStatus: 'ACTIVE',
      cycleEnded: false,
      cycleEndDate: null,
    }
    jsonBodyMock.mockReturnValue({ method: 'POST', body: request })
    clientFetchMock.mockResolvedValue(response)

    const result = await correctAdminOrder(request)

    expect(result).toEqual(response)
    expect(jsonBodyMock).toHaveBeenCalledWith('POST', request)
    expect(clientFetchMock).toHaveBeenCalledWith(
      '/api/admin/trades/order-corrections',
      { method: 'POST', body: request },
    )
  })
})
