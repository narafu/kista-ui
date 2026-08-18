import { describe, expect, it, vi } from 'vitest'
import { financeKeys } from './queryKeys'
import { assetSnapshotListQueryOptions, monthlyClosingListQueryOptions } from './queryOptions'

const { listAssetSnapshotsMock, listMonthlyClosingsMock } = vi.hoisted(() => ({
  listAssetSnapshotsMock: vi.fn(),
  listMonthlyClosingsMock: vi.fn(),
}))

vi.mock('../api', () => ({
  listAssetSnapshots: listAssetSnapshotsMock,
  listMonthlyClosings: listMonthlyClosingsMock,
  listFinanceCategories: vi.fn(),
  listFinanceAccounts: vi.fn(),
}))

describe('finance query options', () => {
  it('forwards the server token and uses the canonical asset-snapshots list key', async () => {
    listAssetSnapshotsMock.mockResolvedValue([])

    const options = assetSnapshotListQueryOptions('server-token')
    if (!options.queryFn) throw new Error('asset snapshot query options require a query function')

    await options.queryFn({} as never)

    expect(options.queryKey).toEqual(financeKeys.assetSnapshots())
    expect(listAssetSnapshotsMock).toHaveBeenCalledWith('server-token')
  })

  it('forwards the server token for monthly closings and uses the canonical key', async () => {
    listMonthlyClosingsMock.mockResolvedValue([])

    const options = monthlyClosingListQueryOptions('server-token')
    if (!options.queryFn) throw new Error('monthly closing query options require a query function')

    await options.queryFn({} as never)

    expect(options.queryKey).toEqual(financeKeys.monthlyClosings())
    expect(listMonthlyClosingsMock).toHaveBeenCalledWith('server-token')
  })
})
