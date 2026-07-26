import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useStrategyOrderPreviewQuery } from './useOrderQueries'
import { orderKeys } from '../model/queryKeys'

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
      queryKey: orderKeys.preview('strategy-1'),
      staleTime: 60_000,
    }))
  })

  function refetchIntervalOf(data: unknown): number | false {
    useQueryMock.mockReturnValue({ data: undefined })
    renderHook(() => useStrategyOrderPreviewQuery('strategy-1'))
    const refetchInterval = useQueryMock.mock.calls.at(-1)?.[0].refetchInterval
    return refetchInterval({ state: { data } })
  }

  it('예수금 조회 실패(BUY) 상태면 5초 간격으로 자동 재시도한다', () => {
    expect(refetchIntervalOf({ competition: { liveBalanceUnavailable: true } })).toBe(5_000)
  })

  it('판매가능수량 조회 실패(SELL) 상태면 5초 간격으로 자동 재시도한다', () => {
    expect(refetchIntervalOf({ competition: null, sellSufficiency: { liveQuantityUnavailable: true } })).toBe(5_000)
  })

  it('둘 다 확인 실패가 아니면 자동 재시도를 걸지 않는다', () => {
    expect(refetchIntervalOf({
      competition: { liveBalanceUnavailable: false },
      sellSufficiency: { liveQuantityUnavailable: false },
    })).toBe(false)
  })

  it('데이터가 없으면 자동 재시도를 걸지 않는다', () => {
    expect(refetchIntervalOf(undefined)).toBe(false)
  })
})
