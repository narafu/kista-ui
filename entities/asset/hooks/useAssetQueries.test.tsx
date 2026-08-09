import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { assetKeys } from '../model/queryKeys'
import { useAssetMonthlyChecksQuery, useAssetsQuery } from './useAssetQueries'

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
  listAssets: vi.fn(),
  listAssetMonthlyChecks: vi.fn(),
}))

describe('useAssetsQuery', () => {
  it('uses the canonical list key', () => {
    renderHook(() => useAssetsQuery())

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: assetKeys.list(),
    }))
  })
})

describe('useAssetMonthlyChecksQuery', () => {
  it('uses the canonical monthly-checks key', () => {
    renderHook(() => useAssetMonthlyChecksQuery())

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: assetKeys.monthlyChecks(),
    }))
  })
})
