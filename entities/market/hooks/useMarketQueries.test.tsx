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

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
}))

vi.mock('../api', () => ({
  getCandlesClient: getCandlesClientMock,
  getFearGreedClient: getFearGreedClientMock,
  getMonthlyHolidaysClient: getMonthlyHolidaysClientMock,
}))

describe('market query freshness and error handling', () => {
  it('keeps hydrated monthly holidays fresh for one day', () => {
    useQueryMock.mockReturnValue({ data: ['2026-07-04'], isFetching: false })

    renderHook(() => useMonthlyHolidaysQuery(2026, 7, ['2026-07-04']))

    expect(useQueryMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      queryKey: marketKeys.holidays(2026, 7),
      staleTime: 86_400_000,
    }))
  })

  it('treats an explicitly hydrated empty month differently from missing initial data', () => {
    useQueryMock.mockReturnValue({ data: [], isFetching: false })
    renderHook(() => useMonthlyHolidaysQuery(2026, 7, []))
    const hydratedEmptyOptions = useQueryMock.mock.calls.at(-1)?.[0]

    renderHook(() => useMonthlyHolidaysQuery(2026, 7))
    const unhydratedOptions = useQueryMock.mock.calls.at(-1)?.[0]

    expect(hydratedEmptyOptions).toEqual(expect.objectContaining({ initialData: [], staleTime: 86_400_000 }))
    expect(unhydratedOptions).toEqual(expect.objectContaining({ initialData: undefined, staleTime: 0 }))
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
