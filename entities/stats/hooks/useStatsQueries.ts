'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  getHousingBenchmarkComparison,
  getHousingBenchmarkRegions,
  getHousingBenchmarkSeries,
  getStatsCycles,
} from '../api'
import { equityCurveQueryOptions, statsSummaryQueryOptions } from '../model/queryOptions'
import { statsKeys } from '../model/queryKeys'
import type {
  CyclePerformance,
  CyclePerformancePage,
  HousingBenchmarkComparison,
  HousingBenchmarkParams,
  HousingBenchmarkRegionsList,
  HousingBenchmarkSeries,
} from '../model/types'

export function useStatsSummaryQuery() {
  return useQuery(statsSummaryQueryOptions())
}

export interface EquityCurveParams {
  from?: string
  to?: string
  type?: string
}

export function useEquityCurveQuery(params: EquityCurveParams) {
  return useQuery({
    ...equityCurveQueryOptions(params),
    placeholderData: (prev) => prev,
  })
}

export function useHousingBenchmarkQuery(params: HousingBenchmarkParams, enabled: boolean) {
  return useQuery<HousingBenchmarkComparison>({
    queryKey: statsKeys.housingComparison(params),
    queryFn: () => getHousingBenchmarkComparison(params),
    enabled,
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  })
}

export interface HousingBenchmarkSeriesParams {
  from?: string
  to?: string
  regionCode?: string
}

export function useHousingBenchmarkSeriesQuery(params: HousingBenchmarkSeriesParams, enabled: boolean) {
  return useQuery<HousingBenchmarkSeries>({
    queryKey: statsKeys.housingSeries(params.from, params.to, params.regionCode),
    queryFn: () => getHousingBenchmarkSeries(params),
    enabled,
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  })
}

// 지역 목록은 KB Land 원본이 자주 바뀌지 않으므로 staleTime을 넉넉히 둔다
export function useHousingBenchmarkRegionsQuery(enabled: boolean) {
  return useQuery<HousingBenchmarkRegionsList>({
    queryKey: statsKeys.housingRegions(),
    queryFn: () => getHousingBenchmarkRegions(),
    enabled,
    staleTime: 60 * 60 * 1000,
  })
}

export function useStatsCyclesQuery(type?: string) {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<CyclePerformancePage>({
      queryKey: statsKeys.cycles(type ?? 'ALL'),
      queryFn: ({ pageParam }) =>
        getStatsCycles({ type, cursor: pageParam as string | undefined }),
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      placeholderData: (prev) => prev,
      staleTime: 60_000,
    })

  const cycles: CyclePerformance[] = data?.pages.flatMap((p) => p.items) ?? []
  return { cycles, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage }
}
