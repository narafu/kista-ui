'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  getEquityCurve,
  getHousingBenchmarkComparison,
  getHousingBenchmarkRegions,
  getHousingBenchmarkSeries,
  getStatsCycles,
  getStatsSummary,
} from '../api'
import type {
  CyclePerformance,
  CyclePerformancePage,
  EquityCurve,
  HousingBenchmarkComparison,
  HousingBenchmarkParams,
  HousingBenchmarkRegionsList,
  HousingBenchmarkSeries,
  StatsSummary,
} from '../model/types'

const EMPTY_CYCLE_PAGE: CyclePerformancePage = { items: [], nextCursor: null, hasMore: false }

export function useStatsSummaryQuery(initialData?: StatsSummary) {
  return useQuery<StatsSummary>({
    queryKey: ['statsSummary'],
    queryFn: () => getStatsSummary(),
    initialData,
  })
}

export interface EquityCurveParams {
  from?: string
  to?: string
  type?: string
}

export function useEquityCurveQuery(params: EquityCurveParams, initialData?: EquityCurve) {
  return useQuery<EquityCurve>({
    queryKey: ['equityCurve', params.from, params.to, params.type ?? 'ALL'],
    queryFn: () => getEquityCurve(params),
    initialData,
    placeholderData: (prev) => prev,
  })
}

export function useHousingBenchmarkQuery(params: HousingBenchmarkParams, enabled: boolean) {
  return useQuery<HousingBenchmarkComparison>({
    queryKey: [
      'housingBenchmark',
      params.scope,
      params.strategyId ?? null,
      params.benchmarkType,
      params.benchmarkType === 'HOUSING' ? params.quintile : null,
      params.benchmarkType === 'ETF' ? params.symbol : null,
      params.from ?? null,
      params.to ?? null,
    ],
    queryFn: () => getHousingBenchmarkComparison(params),
    enabled,
    placeholderData: (previous) => previous,
  })
}

export interface HousingBenchmarkSeriesParams {
  from?: string
  to?: string
  regionCode?: string
}

export function useHousingBenchmarkSeriesQuery(params: HousingBenchmarkSeriesParams, enabled: boolean) {
  return useQuery<HousingBenchmarkSeries>({
    queryKey: ['housingBenchmarkSeries', params.from ?? null, params.to ?? null, params.regionCode ?? null],
    queryFn: () => getHousingBenchmarkSeries(params),
    enabled,
    placeholderData: (prev) => prev,
  })
}

// 지역 목록은 KB Land 원본이 자주 바뀌지 않으므로 staleTime을 넉넉히 둔다
export function useHousingBenchmarkRegionsQuery(enabled: boolean) {
  return useQuery<HousingBenchmarkRegionsList>({
    queryKey: ['housingBenchmarkRegions'],
    queryFn: () => getHousingBenchmarkRegions(),
    enabled,
    staleTime: 60 * 60 * 1000,
  })
}

export function useStatsCyclesQuery(type?: string) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<CyclePerformancePage>({
      queryKey: ['statsCycles', type ?? 'ALL'],
      queryFn: ({ pageParam }) =>
        getStatsCycles({ type, cursor: pageParam as string | undefined }).catch(
          () => EMPTY_CYCLE_PAGE
        ),
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      placeholderData: (prev) => prev,
    })

  const cycles: CyclePerformance[] = data?.pages.flatMap((p) => p.items) ?? []
  return { cycles, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage }
}
