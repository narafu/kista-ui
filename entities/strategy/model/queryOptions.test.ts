import { describe, expect, it, vi } from 'vitest'

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

describe('strategy query options', () => {
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
    if (!options.queryFn) throw new Error('strategy detail query options require a query function')

    await expect(options.queryFn({} as never)).resolves.toEqual(strategy)
    expect(options.queryKey).toEqual(strategyKeys.detail(strategy.id))
    expect(listStrategiesMock).toHaveBeenCalledWith(strategy.accountId, 'server-token')
  })

  it('distinguishes successful absence from a strategy-list transport failure', async () => {
    const missing = strategyDetailQueryOptions('account-1', 'missing', 'server-token')
    if (!missing.queryFn) throw new Error('strategy detail query options require a query function')
    listStrategiesMock.mockResolvedValueOnce([])

    await expect(missing.queryFn({} as never)).resolves.toBeNull()

    const backendError = new Error('backend unavailable')
    listStrategiesMock.mockRejectedValueOnce(backendError)
    await expect(missing.queryFn({} as never)).rejects.toBe(backendError)
  })
})
