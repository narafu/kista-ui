import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useStrategyOrderPreviewQuery, useStrategyOrdersQuery } from './useOrderQueries'
import { orderKeys } from '../model/queryKeys'

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  queryOptions: (options: unknown) => options,
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
      queryKey: orderKeys.preview('strategy-1'),
      staleTime: 60_000,
    }))
  })

  it('라이브 조회가 없어졌으므로 자동 재시도(refetchInterval)를 걸지 않는다', () => {
    useQueryMock.mockReturnValue({ data: undefined })

    renderHook(() => useStrategyOrderPreviewQuery('strategy-1'))

    expect(useQueryMock.mock.calls.at(-1)?.[0].refetchInterval).toBeUndefined()
  })
})

describe('useStrategyOrdersQuery', () => {
  it('historical order data stays fresh for one minute', () => {
    useQueryMock.mockReturnValue({ data: undefined })

    renderHook(() => useStrategyOrdersQuery('strategy-1', '2026-07-01', '2026-07-31'))

    expect(useQueryMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      queryKey: orderKeys.history('strategy-1', '2026-07-01', '2026-07-31'),
      staleTime: 60_000,
    }))
  })
})
