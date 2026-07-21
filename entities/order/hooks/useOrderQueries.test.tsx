import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useStrategyOrderPreviewQuery } from './useOrderQueries'

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

vi.mock('../api', () => ({
  getStrategyOrdersPreview: vi.fn(),
  cancelAllOrders: vi.fn(),
  cancelOneOrder: vi.fn(),
  listStrategyOrders: vi.fn(),
}))

describe('useStrategyOrderPreviewQuery', () => {
  it('카드 목록 재진입 시 재사용할 수 있도록 staleTime을 부여한다', () => {
    useQueryMock.mockReturnValue({ data: undefined })

    renderHook(() => useStrategyOrderPreviewQuery('strategy-1'))

    expect(useQueryMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      queryKey: ['order-preview', 'strategy', 'strategy-1'],
      staleTime: 60_000,
    }))
  })
})
