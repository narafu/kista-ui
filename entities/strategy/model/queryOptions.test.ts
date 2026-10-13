import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { strategyKeys } from './queryKeys'
import {
  strategyDetailQueryOptions,
  strategyListAllQueryOptions,
  strategyListByAccountQueryOptions,
} from './queryOptions'

const { listAllStrategiesMock, listStrategiesMock } = vi.hoisted(() => ({
  listAllStrategiesMock: vi.fn(),
  listStrategiesMock: vi.fn(),
}))

vi.mock('../api', () => ({
  listAllStrategies: listAllStrategiesMock,
  listStrategies: listStrategiesMock,
}))

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } })
}

describe('strategy query options', () => {
  beforeEach(() => {
    listAllStrategiesMock.mockReset()
    listStrategiesMock.mockReset()
  })

  it('is importable from the server-compatible model module and forwards server tokens', async () => {
    listAllStrategiesMock.mockResolvedValue([])
    listStrategiesMock.mockResolvedValue([])

    const all = strategyListAllQueryOptions('server-token')
    const byAccount = strategyListByAccountQueryOptions('account-1', 'server-token')
    if (!all.queryFn || !byAccount.queryFn) throw new Error('strategy query options require query functions')

    await all.queryFn({} as never)
    await byAccount.queryFn({} as never)

    expect(all.queryKey).toEqual(strategyKeys.listAll())
    expect(byAccount.queryKey).toEqual(strategyKeys.listByAccount('account-1'))
    expect(listAllStrategiesMock).toHaveBeenCalledWith('server-token')
    expect(listStrategiesMock).toHaveBeenCalledWith('account-1', 'server-token')
  })

  it('resolves one complete strategy on the canonical detail key', async () => {
    const strategy = {
      id: 'strategy-1',
      accountId: 'account-1',
      type: 'INFINITE',
      status: 'ACTIVE',
      ticker: 'TQQQ',
      cycleSeedType: 'MAX',
      initialUsdDeposit: 1000,
      divisionCount: 20,
      isReverseMode: false,
    }
    listStrategiesMock.mockResolvedValue([strategy])

    const options = strategyDetailQueryOptions(strategy.accountId, strategy.id, 'server-token')

    await expect(createClient().fetchQuery(options)).resolves.toEqual(strategy)
    expect(options.queryKey).toEqual(strategyKeys.detail(strategy.id))
    expect(listStrategiesMock).toHaveBeenCalledWith(strategy.accountId, 'server-token')
  })

  it('distinguishes successful absence from a strategy-list transport failure', async () => {
    const missing = strategyDetailQueryOptions('account-1', 'missing', 'server-token')
    listStrategiesMock.mockResolvedValueOnce([])

    await expect(createClient().fetchQuery(missing)).resolves.toBeNull()

    const backendError = new Error('backend unavailable')
    listStrategiesMock.mockRejectedValueOnce(backendError)
    await expect(createClient().fetchQuery(missing)).rejects.toBe(backendError)
  })

  it('shares one list request when list and detail are invalidated together (trade SSE order: lists, then details)', async () => {
    const client = createClient()
    listStrategiesMock.mockResolvedValue([{ id: 'strategy-1', currentHoldings: 0 }])
    const unsubscribe = [
      new QueryObserver(client, strategyListByAccountQueryOptions('account-1')).subscribe(() => {}),
      new QueryObserver(client, strategyDetailQueryOptions('account-1', 'strategy-1')).subscribe(() => {}),
    ]
    await vi.waitFor(() => expect(client.getQueryData(strategyKeys.detail('strategy-1'))).not.toBeUndefined())
    listStrategiesMock.mockClear()
    listStrategiesMock.mockResolvedValue([{ id: 'strategy-1', currentHoldings: 3 }])

    await Promise.all([
      client.invalidateQueries({ queryKey: strategyKeys.lists() }),
      client.invalidateQueries({ queryKey: strategyKeys.details() }),
    ])

    expect(listStrategiesMock).toHaveBeenCalledOnce()
    expect(client.getQueryData(strategyKeys.detail('strategy-1'))).toEqual({ id: 'strategy-1', currentHoldings: 3 })
    unsubscribe.forEach((stop) => stop())
  })

  it('resolves fresh detail data when one strategyKeys.all invalidation refetches detail before list', async () => {
    const client = createClient()
    listStrategiesMock.mockResolvedValue([{ id: 'strategy-1', currentHoldings: 0 }])
    const unsubscribe = [
      new QueryObserver(client, strategyDetailQueryOptions('account-1', 'strategy-1')).subscribe(() => {}),
      new QueryObserver(client, strategyListByAccountQueryOptions('account-1')).subscribe(() => {}),
    ]
    await vi.waitFor(() => expect(client.getQueryData(strategyKeys.detail('strategy-1'))).not.toBeUndefined())
    listStrategiesMock.mockResolvedValue([{ id: 'strategy-1', currentHoldings: 5 }])

    await client.invalidateQueries({ queryKey: strategyKeys.all })

    expect(client.getQueryState(strategyKeys.detail('strategy-1'))?.status).toBe('success')
    expect(client.getQueryData(strategyKeys.detail('strategy-1'))).toEqual({ id: 'strategy-1', currentHoldings: 5 })
    unsubscribe.forEach((stop) => stop())
  })
})
