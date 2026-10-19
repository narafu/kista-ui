import { QueryClient, dehydrate } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { marketKeys } from './queryKeys'
import { monthlyHolidaysQueryOptions } from './queryOptions'

const {
  getMonthlyHolidaysPublicMock,
  getMonthlyHolidaysClientMock,
} = vi.hoisted(() => ({
  getMonthlyHolidaysPublicMock: vi.fn(),
  getMonthlyHolidaysClientMock: vi.fn(),
}))

vi.mock('../api', () => ({
  getMonthlyHolidaysPublic: getMonthlyHolidaysPublicMock,
  getMonthlyHolidaysClient: getMonthlyHolidaysClientMock,
}))

describe('monthlyHolidaysQueryOptions', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    getMonthlyHolidaysPublicMock.mockReset()
    getMonthlyHolidaysClientMock.mockReset()
  })

  it('uses the canonical holidays key with a 24h staleTime — 서버는 월 1회만 갱신', () => {
    const options = monthlyHolidaysQueryOptions(2026, 7)

    expect(options.queryKey).toEqual(marketKeys.holidays(2026, 7))
    expect(options.staleTime).toBe(1000 * 60 * 60 * 24)
  })

  it('server → calls the public endpoint without a token (logged in or not)', async () => {
    vi.stubGlobal('window', undefined)
    getMonthlyHolidaysPublicMock.mockResolvedValue([])

    const options = monthlyHolidaysQueryOptions(2026, 7)
    if (!options.queryFn) throw new Error('monthlyHolidaysQueryOptions requires a query function')
    await options.queryFn({} as never)

    expect(getMonthlyHolidaysPublicMock).toHaveBeenCalledWith(2026, 7)
    expect(getMonthlyHolidaysClientMock).not.toHaveBeenCalled()
  })

  it('client (browser) → always uses the Route Handler client fetch', async () => {
    // jsdom 기본 환경 — window가 정의됨
    getMonthlyHolidaysClientMock.mockResolvedValue([])

    const options = monthlyHolidaysQueryOptions(2026, 7)
    if (!options.queryFn) throw new Error('monthlyHolidaysQueryOptions requires a query function')
    await options.queryFn({} as never)

    expect(getMonthlyHolidaysClientMock).toHaveBeenCalledWith(2026, 7)
    expect(getMonthlyHolidaysPublicMock).not.toHaveBeenCalled()
  })

  it('a failed server prefetch must not be dehydrated as a successful empty month — react-query only dehydrates status:"success" queries by default, so callers should .catch(() => undefined) around prefetchQuery and let the client refetch', async () => {
    vi.stubGlobal('window', undefined)
    const failure = new Error('holiday request failed')
    getMonthlyHolidaysPublicMock.mockRejectedValue(failure)

    const options = monthlyHolidaysQueryOptions(2026, 7)
    if (!options.queryFn) throw new Error('monthlyHolidaysQueryOptions requires a query function')
    await expect(options.queryFn({} as never)).rejects.toThrow(failure)
  })

  describe('dehydrate exclusion (real QueryClient — proves the mechanism, not just the reasoning)', () => {
    it('excludes a failed month from dehydrate() while including a successfully-empty month', async () => {
      vi.stubGlobal('window', undefined)
      const queryClient = new QueryClient()

      getMonthlyHolidaysPublicMock.mockRejectedValueOnce(new Error('holiday request failed'))
      await queryClient.prefetchQuery(monthlyHolidaysQueryOptions(2026, 7)).catch(() => undefined)

      getMonthlyHolidaysPublicMock.mockResolvedValueOnce([])
      await queryClient.prefetchQuery(monthlyHolidaysQueryOptions(2026, 8))

      const dehydrated = dehydrate(queryClient)
      const dehydratedKeys = dehydrated.queries.map((query) => query.queryKey)

      expect(dehydratedKeys).not.toContainEqual(marketKeys.holidays(2026, 7))
      expect(dehydratedKeys).toContainEqual(marketKeys.holidays(2026, 8))

      queryClient.clear()
    })
  })
})
