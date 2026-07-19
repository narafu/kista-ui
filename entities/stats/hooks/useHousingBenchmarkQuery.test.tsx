import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HousingBenchmarkComparison } from '../model/types'
import { useHousingBenchmarkQuery } from './useStatsQueries'

const { getHousingBenchmarkComparisonMock, useQueryMock } = vi.hoisted(() => ({
  getHousingBenchmarkComparisonMock: vi.fn(),
  useQueryMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: vi.fn(),
  useQuery: useQueryMock,
}))

vi.mock('../api', () => ({
  getEquityCurve: vi.fn(),
  getHousingBenchmarkComparison: getHousingBenchmarkComparisonMock,
  getStatsCycles: vi.fn(),
  getStatsSummary: vi.fn(),
}))

const params = {
  scope: 'PORTFOLIO' as const,
  quintile: 3 as const,
  from: '2021-07-01',
  to: '2026-07-01',
}

describe('useHousingBenchmarkQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useQueryMock.mockImplementation((options: { enabled?: boolean; queryFn: () => unknown }) => {
      if (options.enabled !== false) options.queryFn()
      return {}
    })
  })

  it('uses every filter in the query key and request', () => {
    renderHook(() => useHousingBenchmarkQuery(params, true))

    const options = useQueryMock.mock.calls.at(-1)?.[0] as {
      queryKey: unknown[]
    }
    expect(options.queryKey).toEqual([
      'housingBenchmark', 'PORTFOLIO', null, 3, '2021-07-01', '2026-07-01',
    ])

    expect(getHousingBenchmarkComparisonMock).toHaveBeenCalledWith(params)
  })

  it('does not request data while disabled', () => {
    renderHook(() => useHousingBenchmarkQuery(params, false))

    const options = useQueryMock.mock.calls.at(-1)?.[0] as {
      enabled: boolean
      queryFn: () => Promise<unknown>
    }
    expect(options.enabled).toBe(false)
    expect(getHousingBenchmarkComparisonMock).not.toHaveBeenCalled()
  })

  it('keeps previous chart data while filters change', () => {
    renderHook(() => useHousingBenchmarkQuery(params, true))

    const previous: HousingBenchmarkComparison = {
      scope: 'PORTFOLIO',
      strategy: null,
      benchmark: {
        regionCode: '11680',
        regionName: '강남구',
        quintile: 3,
        label: '강남구 3분위',
        sourceUpdatedDate: '2026-07-01',
      },
      period: { fromMonth: '2021-07-01', toMonth: '2026-07-01', monthCount: 61 },
      summary: null,
      points: [{
        baseMonth: '2026-07-01',
        investmentIndexUsd: 103.2,
        benchmarkIndex: 101.4,
        investmentMonthlyReturn: 3.2,
        benchmarkMonthlyReturn: 1.4,
      }],
      currentExchangeRate: null,
      quality: {
        method: 'MONTHLY',
        investmentCurrency: 'USD',
        benchmarkCurrency: 'KRW',
        notice: 'test',
      },
      emptyReason: null,
    }
    const options = useQueryMock.mock.calls.at(-1)?.[0] as {
      placeholderData: (data: HousingBenchmarkComparison) => HousingBenchmarkComparison
    }

    expect(options.placeholderData(previous)).toBe(previous)
  })
})
