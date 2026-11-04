import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  listAdminUsers,
  listAdminAccounts,
  listAdminErrorLogs,
  listAdminStrategies,
  softDeleteAdminErrorLog,
  updateAdminStrategyStatus,
} from './index'
import type {
  AdminAccount,
  AdminStrategy,
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

  it('lists admin users with status and date range query parameters', async () => {
    fetchEitherMock.mockResolvedValue([])

    await listAdminUsers('admin-token', 'PENDING', '2026-07-01', '2026-07-31')

    expect(fetchEitherMock).toHaveBeenCalledWith(
      '/api/admin/users?status=PENDING&from=2026-07-01&to=2026-07-31',
      { method: 'GET' },
      'admin-token',
    )
  })

  it('lists admin accounts without requiring a bearer token', async () => {
    const accounts: AdminAccount[] = [
      {
        id: 'account-1',
        userId: 'user-1',
        ownerNickname: '홍길동',
        nickname: '키움 메인',
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

  it('updates admin strategy status through the client route handler', async () => {
    clientFetchMock.mockResolvedValue(undefined)

    await updateAdminStrategyStatus('account-1', 'strategy-1', 'PAUSED')

    expect(jsonBodyMock).toHaveBeenCalledWith('PATCH', { status: 'PAUSED' })
    expect(clientFetchMock).toHaveBeenCalledWith(
      '/api/admin/accounts/account-1/strategies/strategy-1/status',
      { method: 'PATCH', body: { status: 'PAUSED' } },
    )
  })

  it('lists admin error logs with the date range query', async () => {
    fetchEitherMock.mockResolvedValue([])

    await listAdminErrorLogs(500, '2026-07-01', '2026-07-02', 'admin-token')

    expect(fetchEitherMock).toHaveBeenCalledWith(
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
