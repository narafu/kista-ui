import { describe, expect, it, vi } from 'vitest'

import { strategyKeys } from './queryKeys'
import { strategyListAllQueryOptions, strategyListByAccountQueryOptions } from './queryOptions'

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
})
