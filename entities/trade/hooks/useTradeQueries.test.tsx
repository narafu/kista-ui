import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  useAccountCycleHistoryQuery,
  useDailyTradesRangeQuery,
  useStrategyCycleHistoryQuery,
} from '../index'
import { tradeKeys } from '../model/queryKeys'

const { useInfiniteQueryMock, useQueryMock, getAccountCycleHistoryMock, getStrategyCycleHistoryMock } = vi.hoisted(() => ({
  useInfiniteQueryMock: vi.fn(),
  useQueryMock: vi.fn(),
  getAccountCycleHistoryMock: vi.fn(),
  getStrategyCycleHistoryMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: useInfiniteQueryMock,
  useQuery: useQueryMock,
}))

vi.mock('../api', () => ({
  getAccountCycleHistory: getAccountCycleHistoryMock,
  getStrategyCycleHistory: getStrategyCycleHistoryMock,
  getDailyTransactionsBatch: vi.fn(),
}))

const emptyInfiniteResult = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  fetchNextPage: vi.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
}

describe('trade query freshness and error handling', () => {
  it('keeps daily trade ranges fresh for five minutes', () => {
    useQueryMock.mockReturnValue({ data: undefined })
    const from = new Date('2026-07-01T00:00:00')
    const to = new Date('2026-07-07T00:00:00')

    renderHook(() => useDailyTradesRangeQuery(['account-2', 'account-1'], from, to))

    expect(useQueryMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      queryKey: tradeKeys.dailyRange(['account-1', 'account-2'], '2026-07-01', '2026-07-07'),
      staleTime: 300_000,
    }))
  })

  it('keeps account cycle history fresh for five minutes and propagates request failures', async () => {
    const failure = new Error('account history failed')
    getAccountCycleHistoryMock.mockRejectedValueOnce(failure)
    useInfiniteQueryMock.mockReturnValue(emptyInfiniteResult)

    renderHook(() => useAccountCycleHistoryQuery('account-1', { from: '2026-07-01' }))

    const options = useInfiniteQueryMock.mock.calls.at(-1)?.[0]
    expect(options).toEqual(expect.objectContaining({
      queryKey: tradeKeys.accountCycleHistory('account-1', { from: '2026-07-01' }),
      staleTime: 300_000,
    }))
    await expect(options.queryFn({ pageParam: undefined })).rejects.toThrow(failure)
  })

  it('keeps strategy cycle history fresh for five minutes and propagates request failures', async () => {
    const failure = new Error('strategy history failed')
    getStrategyCycleHistoryMock.mockRejectedValueOnce(failure)
    useInfiniteQueryMock.mockReturnValue(emptyInfiniteResult)

    renderHook(() => useStrategyCycleHistoryQuery('strategy-1', { to: '2026-07-31' }))

    const options = useInfiniteQueryMock.mock.calls.at(-1)?.[0]
    expect(options).toEqual(expect.objectContaining({
      queryKey: tradeKeys.strategyCycleHistory('strategy-1', { to: '2026-07-31' }),
      staleTime: 300_000,
    }))
    await expect(options.queryFn({ pageParam: undefined })).rejects.toThrow(failure)
  })
})
