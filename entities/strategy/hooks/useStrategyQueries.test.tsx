import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Strategy } from '../model/types'
import { useAllStrategiesQuery } from './useStrategyQueries'

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

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['strategies', 'all'],
      initialData: [baseStrategy],
      initialDataUpdatedAt: 0,
    }))
  })
})
