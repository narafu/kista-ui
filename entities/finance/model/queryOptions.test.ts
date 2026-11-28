import { describe, expect, it, vi } from 'vitest'
import { financeKeys } from './queryKeys'
import { keepPreviousData } from '@shared/lib/query'
import { assetSnapshotListQueryOptions, flowSummaryQueryOptions, monthlyClosingListQueryOptions } from './queryOptions'

const { listAssetSnapshotsMock, listMonthlyClosingsMock, getFlowSummaryMock } = vi.hoisted(() => ({
  getFlowSummaryMock: vi.fn(),
  listAssetSnapshotsMock: vi.fn(),
  listMonthlyClosingsMock: vi.fn(),
}))

vi.mock('../api', () => ({
  listAssetSnapshots: listAssetSnapshotsMock,
  listMonthlyClosings: listMonthlyClosingsMock,
  listFinanceCategories: vi.fn(),
  listFinanceAccounts: vi.fn(),
  listFinanceGroups: vi.fn(),
  getFlowSummary: getFlowSummaryMock,
}))

describe('finance query options', () => {
  it('forwards the server token and uses the canonical asset-snapshots list key', async () => {
    listAssetSnapshotsMock.mockResolvedValue([])

    const options = assetSnapshotListQueryOptions('2026-08', 'server-token')
    if (!options.queryFn) throw new Error('asset snapshot query options require a query function')

    await options.queryFn({} as never)

    expect(options.queryKey).toEqual(financeKeys.assetSnapshots('2026-08'))
    expect(listAssetSnapshotsMock).toHaveBeenCalledWith({ month: '2026-08', token: 'server-token' })
  })

  it('forwards the server token for monthly closings and uses the canonical key', async () => {
    listMonthlyClosingsMock.mockResolvedValue([])

    const options = monthlyClosingListQueryOptions('server-token')
    if (!options.queryFn) throw new Error('monthly closing query options require a query function')

    await options.queryFn({} as never)

    expect(options.queryKey).toEqual(financeKeys.monthlyClosings())
    expect(listMonthlyClosingsMock).toHaveBeenCalledWith('server-token')
  })

  it('연간 집계는 선택 연도만 키·요청에 싣고(월간 탭에서 남은 mm 제거), 전환 중 이전 응답을 유지한다', async () => {
    getFlowSummaryMock.mockResolvedValue({})
    const march = flowSummaryQueryOptions('EXPENSE', { month: '2026-03', mode: 'yearly' })
    const august = flowSummaryQueryOptions('EXPENSE', { month: '2026-08', mode: 'yearly' })

    expect(march.queryKey).toEqual(august.queryKey)
    expect(march.placeholderData).toBe(keepPreviousData)
    await march.queryFn!({} as never)
    expect(getFlowSummaryMock).toHaveBeenCalledWith({ type: 'EXPENSE', period: { month: '2026-01', mode: 'yearly' } })

    expect(flowSummaryQueryOptions('EXPENSE', { month: '2026-03', mode: 'monthly' }).queryKey)
      .not.toEqual(flowSummaryQueryOptions('EXPENSE', { month: '2026-08', mode: 'monthly' }).queryKey)
  })
})
