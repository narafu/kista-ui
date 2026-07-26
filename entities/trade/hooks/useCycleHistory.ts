'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { getAccountCycleHistory, getStrategyCycleHistory } from '../api'
import type { CycleHistoryItem, CycleHistoryPage } from '../model/types'
import { tradeKeys, type CycleHistoryKeyParams } from '../model/queryKeys'

export type DateParams = CycleHistoryKeyParams

export function useAccountCycleHistoryQuery(accountId: string, params: DateParams) {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<CycleHistoryPage>({
      queryKey: tradeKeys.accountCycleHistory(accountId, params),
      queryFn: ({ pageParam }) =>
        getAccountCycleHistory(accountId, {
          ...(params ?? {}),
          cursor: pageParam as string | undefined,
        }),
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      enabled: params !== null,
      placeholderData: (prev) => prev,
      staleTime: 300_000,
    })

  const cycleHistory: CycleHistoryItem[] = data?.pages.flatMap((p) => p.items) ?? []
  return { cycleHistory, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage }
}

export function useStrategyCycleHistoryQuery(strategyId: string | undefined, params: DateParams) {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<CycleHistoryPage>({
      queryKey: tradeKeys.strategyCycleHistory(strategyId!, params),
      queryFn: ({ pageParam }) =>
        getStrategyCycleHistory(strategyId!, {
          ...(params ?? {}),
          cursor: pageParam as string | undefined,
        }),
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      enabled: params !== null && !!strategyId,
      placeholderData: (prev) => prev,
      staleTime: 300_000,
    })

  const cycleHistory: CycleHistoryItem[] = data?.pages.flatMap((p) => p.items) ?? []
  return { cycleHistory, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage }
}
