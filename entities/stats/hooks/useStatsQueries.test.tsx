import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useEquityCurveQuery, useStatsCyclesQuery, useStatsSummaryQuery } from './useStatsQueries'
import { statsKeys } from '../model/queryKeys'

const { useQueryMock, getStatsCyclesMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  getStatsCyclesMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  queryOptions: (options: unknown) => options,
}))

vi.mock('../api', () => ({
  getEquityCurve: vi.fn(),
  getHousingBenchmarkComparison: vi.fn(),
  getHousingBenchmarkRegions: vi.fn(),
  getHousingBenchmarkSeries: vi.fn(),
  getStatsCycles: getStatsCyclesMock,
  getStatsSummary: vi.fn(),
}))

describe('stats query freshness and error handling', () => {
  it('keeps summary and equity-curve data fresh for one minute', () => {
    useQueryMock.mockReturnValue({ data: undefined })
    renderHook(() => useStatsSummaryQuery())
    const summaryOptions = useQueryMock.mock.calls.at(-1)?.[0]

    renderHook(() => useEquityCurveQuery({ from: '2026-07-01', to: '2026-07-31' }))
    const equityOptions = useQueryMock.mock.calls.at(-1)?.[0]

    expect(summaryOptions).toEqual(expect.objectContaining({
      queryKey: statsKeys.summary(),
      staleTime: 60_000,
    }))
    expect(equityOptions).toEqual(expect.objectContaining({
      queryKey: statsKeys.equityCurve('2026-07-01', '2026-07-31', 'ALL'),
      staleTime: 60_000,
    }))
  })

  it('keeps cycle performance fresh for one minute and propagates request failures', async () => {
    const failure = new Error('stats cycles failed')
    getStatsCyclesMock.mockRejectedValueOnce(failure)
    useQueryMock.mockReturnValue({ data: undefined })

    renderHook(() => useStatsCyclesQuery({ type: 'VR', status: 'ACTIVE', page: 2, size: 10 }))

    const options = useQueryMock.mock.calls.at(-1)?.[0]
    expect(options).toEqual(expect.objectContaining({
      queryKey: statsKeys.cycles({ type: 'VR', status: 'ACTIVE', page: 2, size: 10 }),
      staleTime: 60_000,
    }))
    await expect(options.queryFn()).rejects.toThrow(failure)
    expect(getStatsCyclesMock).toHaveBeenCalledWith({ type: 'VR', status: 'ACTIVE', page: 2, size: 10 })
  })
})
