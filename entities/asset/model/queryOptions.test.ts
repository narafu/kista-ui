import { describe, expect, it, vi } from 'vitest'
import { assetKeys } from './queryKeys'
import { assetListQueryOptions, assetMonthlyChecksQueryOptions } from './queryOptions'

const { listAssetsMock, listAssetMonthlyChecksMock } = vi.hoisted(() => ({
  listAssetsMock: vi.fn(),
  listAssetMonthlyChecksMock: vi.fn(),
}))

vi.mock('../api', () => ({
  listAssets: listAssetsMock,
  listAssetMonthlyChecks: listAssetMonthlyChecksMock,
}))

describe('asset query options', () => {
  it('forwards the server token and uses the canonical list key', async () => {
    listAssetsMock.mockResolvedValue([])

    const options = assetListQueryOptions('server-token')
    if (!options.queryFn) throw new Error('asset query options require a query function')

    await options.queryFn({} as never)

    expect(options.queryKey).toEqual(assetKeys.list())
    expect(listAssetsMock).toHaveBeenCalledWith('server-token')
  })

  it('forwards the server token for monthly checks and uses the canonical key', async () => {
    listAssetMonthlyChecksMock.mockResolvedValue([])

    const options = assetMonthlyChecksQueryOptions('server-token')
    if (!options.queryFn) throw new Error('asset monthly-check query options require a query function')

    await options.queryFn({} as never)

    expect(options.queryKey).toEqual(assetKeys.monthlyChecks())
    expect(listAssetMonthlyChecksMock).toHaveBeenCalledWith('server-token')
  })
})
