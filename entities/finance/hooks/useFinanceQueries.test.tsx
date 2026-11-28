import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { financeKeys } from '../model/queryKeys'
import {
  useAssetSnapshotsQuery,
  useFinanceAccountsQuery,
  useFinanceCategoriesQuery,
  useLatestTransactionDateQuery,
  useMonthlyClosingsQuery,
} from './useFinanceQueries'

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(() => ({ data: [] })),
}))

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query')
  return {
    ...actual,
    useQuery: useQueryMock,
  }
})

vi.mock('../api', () => ({
  listAssetSnapshots: vi.fn(),
  listFinanceCategories: vi.fn(),
  listFinanceAccounts: vi.fn(),
  listFinanceGroupMembers: vi.fn(),
  listFinanceGroups: vi.fn(),
  listMonthlyClosings: vi.fn(),
  listFinanceTransactions: vi.fn(),
}))

describe('useAssetSnapshotsQuery', () => {
  it('uses the canonical asset-snapshots list key', () => {
    renderHook(() => useAssetSnapshotsQuery('2026-08'))

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: financeKeys.assetSnapshots('2026-08'),
    }))
  })
})

describe('useLatestTransactionDateQuery', () => {
  it('범위 키로 조회하고 enabled를 그대로 넘긴다', () => {
    renderHook(() => useLatestTransactionDateQuery({ from: '2025-09-01', to: '2026-08-31', enabled: false }))

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: financeKeys.latestTransaction('2025-09-01', '2026-08-31'),
      enabled: false,
    }))
  })
})

describe('useFinanceCategoriesQuery', () => {
  it('uses the canonical categories list key for the given type', () => {
    renderHook(() => useFinanceCategoriesQuery('ASSET'))

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: financeKeys.categories('ASSET'),
    }))
  })
})

describe('useFinanceAccountsQuery', () => {
  it('uses the canonical accounts list key', () => {
    renderHook(() => useFinanceAccountsQuery())

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: financeKeys.accounts(),
    }))
  })
})

describe('useMonthlyClosingsQuery', () => {
  it('uses the canonical monthly-closings list key', () => {
    renderHook(() => useMonthlyClosingsQuery())

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: financeKeys.monthlyClosings(),
    }))
  })
})
