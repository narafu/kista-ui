import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Strategy } from '../model/types'
import { useAllStrategiesQuery, useStrategiesQuery, useUpdateStrategyMutation, useExecuteStrategyMutation } from './useStrategyQueries'

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

vi.mock('../api', () => ({
  listAllStrategies: vi.fn(),
  listStrategies: vi.fn(),
  createStrategy: vi.fn(),
  updateStrategy: vi.fn(),
  deleteStrategy: vi.fn(),
  pauseStrategy: vi.fn(),
  resumeStrategy: vi.fn(),
  executeStrategy: vi.fn(),
  getStrategySeedPreview: vi.fn(),
}))

const baseStrategy: Strategy = {
  id: 'strategy-1',
  accountId: 'account-1',
  type: 'INFINITE',
  status: 'ACTIVE',
  ticker: 'MAGX',
  cycleSeedType: 'MAX',
  initialUsdDeposit: 1000,
  divisionCount: 20,
  isReverseMode: false,
}

describe('useAllStrategiesQuery', () => {
  it('marks initial server data stale so the list refetches immediately on mount', () => {
    useQueryMock.mockReturnValue({ data: [baseStrategy] })

    renderHook(() => useAllStrategiesQuery([baseStrategy]))

    expect(useQueryMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      queryKey: ['strategies', 'all'],
      initialData: [baseStrategy],
      initialDataUpdatedAt: 0,
    }))
  })
})

describe('useStrategiesQuery', () => {
  it('marks account strategy initial data stale so detail pages refetch immediately on mount', () => {
    useQueryMock.mockReturnValue({ data: [baseStrategy] })

    renderHook(() => useStrategiesQuery('account-1', [baseStrategy]))

    expect(useQueryMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      queryKey: ['strategies', 'account-1'],
      initialData: [baseStrategy],
      initialDataUpdatedAt: 0,
    }))
  })
})

describe('useUpdateStrategyMutation', () => {
  it('수정 성공 시 실제 주문 미리보기 쿼리 키(order-preview)를 무효화한다', () => {
    const invalidateQueries = vi.fn()
    vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries } as never)
    vi.mocked(useMutation).mockReturnValue({} as never)

    renderHook(() => useUpdateStrategyMutation('strategy-1'))

    const options = vi.mocked(useMutation).mock.calls.at(-1)?.[0] as unknown as { onSuccess: () => void }
    options.onSuccess()

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['order-preview'] })
  })
})

describe('useExecuteStrategyMutation', () => {
  it('실행 성공 시 실제 주문 미리보기 쿼리(order-preview)를 무효화한다', () => {
    const invalidateQueries = vi.fn()
    vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries } as never)
    vi.mocked(useMutation).mockReturnValue({} as never)

    renderHook(() => useExecuteStrategyMutation('strategy-1'))

    const options = vi.mocked(useMutation).mock.calls.at(-1)?.[0] as unknown as { onSuccess: () => void }
    options.onSuccess()

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['order-preview', 'strategy', 'strategy-1'] })
  })
})
