import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { financeKeys } from '../model/queryKeys'
import {
  useAssetSnapshotsQuery,
  useFinanceAccountsQuery,
  useFinanceCategoriesQuery,
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
  listMonthlyClosings: vi.fn(),
}))

describe('useAssetSnapshotsQuery', () => {
  it('uses the canonical asset-snapshots list key', () => {
    renderHook(() => useAssetSnapshotsQuery())

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: financeKeys.assetSnapshots(),
    }))
  })
})

describe('useFinanceCategoriesQuery', () => {
  it('uses the canonical categories list key', () => {
    renderHook(() => useFinanceCategoriesQuery())

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: financeKeys.categories(),
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
