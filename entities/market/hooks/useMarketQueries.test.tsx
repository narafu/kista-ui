import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCandlesQuery, useFearGreedQuery, useMonthlyHolidaysQuery } from './useMarketQueries'
import { marketKeys } from '../model/queryKeys'

const { useQueryMock, getCandlesClientMock, getFearGreedClientMock, getMonthlyHolidaysClientMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  getCandlesClientMock: vi.fn(),
  getFearGreedClientMock: vi.fn(),
  getMonthlyHolidaysClientMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query')
  return {
    ...actual,
    useQuery: useQueryMock,
  }
})

vi.mock('../api', () => ({
  getCandlesClient: getCandlesClientMock,
  getFearGreedClient: getFearGreedClientMock,
  getMonthlyHolidaysClient: getMonthlyHolidaysClientMock,
}))

describe('market query freshness and error handling', () => {
  // initialData/이중 staleTime 분기는 monthlyHolidaysQueryOptions(entities/market/model/queryOptions.ts)로
  // 흡수됐다 — SSR prefetch가 채운 캐시를 이 훅이 그대로 소비하며, 항상 24h staleTime을 사용한다.
  // 실패한 서버 prefetch는 dehydrate에 포함되지 않으므로 클라이언트가 즉시 재조회해
  // "실패 조회를 빈 달로 24시간 hydrate 금지" 시맨틱을 보존한다 (entities/market/model/queryOptions.test.ts 참고).
  it('delegates to monthlyHolidaysQueryOptions for the canonical key and 24h staleTime', () => {
    useQueryMock.mockReturnValue({ data: ['2026-07-04'], isFetching: false })

    renderHook(() => useMonthlyHolidaysQuery(2026, 7))

    expect(useQueryMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      queryKey: marketKeys.holidays(2026, 7),
      staleTime: 86_400_000,
    }))
  })

  it('propagates monthly-holiday request failures', async () => {
    const failure = new Error('holiday request failed')
    getMonthlyHolidaysClientMock.mockRejectedValueOnce(failure)
    useQueryMock.mockReturnValue({ data: undefined, isFetching: false })

    renderHook(() => useMonthlyHolidaysQuery(2026, 7))

    const options = useQueryMock.mock.calls.at(-1)?.[0]
    await expect(options.queryFn()).rejects.toThrow(failure)
  })

  it('keeps candles fresh for ten minutes and propagates request failures', async () => {
    const failure = new Error('candle request failed')
    getCandlesClientMock.mockRejectedValueOnce(failure)
    useQueryMock.mockReturnValue({ data: undefined })

    renderHook(() => useCandlesQuery('SPY', 200))

    const options = useQueryMock.mock.calls.at(-1)?.[0]
    expect(options).toEqual(expect.objectContaining({
      queryKey: marketKeys.candles('SPY', 200),
      staleTime: 600_000,
    }))
    await expect(options.queryFn()).rejects.toThrow(failure)
  })

  it('keeps fear and greed data fresh for six hours and propagates request failures', async () => {
    const failure = new Error('fear and greed request failed')
    getFearGreedClientMock.mockRejectedValueOnce(failure)
    useQueryMock.mockReturnValue({ data: undefined })

    renderHook(() => useFearGreedQuery(30))

    const options = useQueryMock.mock.calls.at(-1)?.[0]
    expect(options).toEqual(expect.objectContaining({
      queryKey: marketKeys.fearGreed(30),
      staleTime: 21_600_000,
    }))
    await expect(options.queryFn()).rejects.toThrow(failure)
  })
})
