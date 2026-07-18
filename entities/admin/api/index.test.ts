import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  reorderAdminOrder,
  listAdminAccounts,
  listAdminErrorLogs,
  listAdminStrategies,
  listAdminStrategyOrders,
  softDeleteAdminErrorLog,
  updateAdminStrategyStatus,
} from './index'
import type {
  AdminAccount,
  AdminReorderRequest,
  AdminReorderResponse,
  AdminStrategy,
  AdminStrategyOrder,
} from '../model/types'

const {
  apiFetchMock,
  fetchEitherMock,
  clientFetchMock,
  jsonBodyMock,
} = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  fetchEitherMock: vi.fn(),
  clientFetchMock: vi.fn(),
  jsonBodyMock: vi.fn(),
}))

vi.mock('@shared/lib/api-client', () => ({
  apiFetch: apiFetchMock,
  clientFetch: clientFetchMock,
  fetchEither: fetchEitherMock,
  jsonBody: jsonBodyMock,
}))

describe('entities/admin/api admin trade correction APIs', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
    fetchEitherMock.mockReset()
    clientFetchMock.mockReset()
    jsonBodyMock.mockReset()
    jsonBodyMock.mockImplementation((method: string, body: unknown) => ({ method, body }))
  })

  it('lists admin accounts without requiring a bearer token', async () => {
    const accounts: AdminAccount[] = [
      {
        id: 'account-1',
        userId: 'user-1',
        ownerNickname: '홍길동',
        accountNoMasked: '123-45****',
        broker: 'KIS',
        strategies: [],
      },
    ]
    fetchEitherMock.mockResolvedValue(accounts)

    const result = await listAdminAccounts()

    expect(result).toEqual(accounts)
    expect(fetchEitherMock).toHaveBeenCalledWith(
      '/api/admin/accounts',
      { method: 'GET' },
      undefined,
    )
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
    fetchEitherMock.mockResolvedValue(strategies)

    const result = await listAdminStrategies('account-1', 'admin-token')

    expect(result).toEqual(strategies)
    expect(fetchEitherMock).toHaveBeenCalledWith(
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
    fetchEitherMock.mockResolvedValue(orders)

    const result = await listAdminStrategyOrders('account-1', 'strategy-1', '2026-07-01', 'admin-token')

    expect(result).toEqual(orders)
    expect(fetchEitherMock).toHaveBeenCalledWith(
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

  it('posts admin reorder through the client route handler', async () => {
    const request: AdminReorderRequest = {
      userId: 'user-1',
      accountId: 'account-1',
      strategyId: 'strategy-1',
      orderId: 'order-1',
      timing: 'AT_CLOSE',
      tradeDate: '2026-07-01',
      quantity: 3,
      price: 250,
      memo: 'price fix',
    }
    const response: AdminReorderResponse = {
      userId: 'user-1',
      accountId: 'account-1',
      strategyId: 'strategy-1',
      sourceOrderId: 'order-1',
      originalStatus: 'PLANNED',
      resultingStatus: 'PLANNED',
      newOrderExternalId: null,
    }
    jsonBodyMock.mockReturnValue({ method: 'POST', body: request })
    clientFetchMock.mockResolvedValue(response)

    const result = await reorderAdminOrder(request)

    expect(result).toEqual(response)
    expect(jsonBodyMock).toHaveBeenCalledWith('POST', request)
    expect(clientFetchMock).toHaveBeenCalledWith(
      '/api/admin/trades/reorders',
      { method: 'POST', body: request },
    )
  })

  it('lists admin error logs with the date range query', async () => {
    fetchEitherMock.mockResolvedValue([])

    await listAdminErrorLogs('admin-token', 500, '2026-07-01', '2026-07-02')

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/api/admin/logs/errors?limit=500&from=2026-07-01&to=2026-07-02',
      { method: 'GET' },
      'admin-token',
    )
  })

  it('soft deletes an admin error log through the client route handler', async () => {
    clientFetchMock.mockResolvedValue(undefined)

    await softDeleteAdminErrorLog('log-1')

    expect(clientFetchMock).toHaveBeenCalledWith(
      '/api/admin/logs/errors/log-1',
      { method: 'DELETE' },
    )
  })
})
