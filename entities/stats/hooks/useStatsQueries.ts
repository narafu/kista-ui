'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  getEquityCurve,
  getHousingBenchmarkComparison,
  getStatsCycles,
  getStatsSummary,
} from '../api'
import type {
  CyclePerformance,
  CyclePerformancePage,
  EquityCurve,
  HousingBenchmarkComparison,
  HousingBenchmarkParams,
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
}

export function useEquityCurveQuery(params: EquityCurveParams, initialData?: EquityCurve) {
  return useQuery<EquityCurve>({
    queryKey: ['equityCurve', params.from, params.to],
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
      params.quintile,
      params.from ?? null,
      params.to ?? null,
    ],
    queryFn: () => getHousingBenchmarkComparison(params),
    enabled,
    placeholderData: (previous) => previous,
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
