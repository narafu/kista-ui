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
  listFinanceGroupMembers: vi.fn(),
  listFinanceGroups: vi.fn(),
  listMonthlyClosings: vi.fn(),
}))

// 활성 그룹 = 개인 그룹(undefined) 고정 — 그룹 전환 자체는 ActiveGroupProvider 테스트에서 다룬다.
vi.mock('../providers/ActiveGroupProvider', () => ({
  useActiveGroupContext: () => ({ groupId: undefined, setGroupId: vi.fn() }),
}))

describe('useAssetSnapshotsQuery', () => {
  it('uses the canonical asset-snapshots list key', () => {
    renderHook(() => useAssetSnapshotsQuery())

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: financeKeys.assetSnapshots(undefined),
    }))
  })
})

describe('useFinanceCategoriesQuery', () => {
  it('uses the canonical categories list key for the given type', () => {
    renderHook(() => useFinanceCategoriesQuery('ASSET'))

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: financeKeys.categories('ASSET', undefined),
    }))
  })
})

describe('useFinanceAccountsQuery', () => {
  it('uses the canonical accounts list key', () => {
    renderHook(() => useFinanceAccountsQuery())

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: financeKeys.accounts(undefined),
    }))
  })
})

describe('useMonthlyClosingsQuery', () => {
  it('uses the canonical monthly-closings list key', () => {
    renderHook(() => useMonthlyClosingsQuery())

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: financeKeys.monthlyClosings(undefined),
    }))
  })
})
