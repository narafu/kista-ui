'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { getAccountCycleHistory, getStrategyCycleHistory } from '../api'
import type { CycleHistoryItem, CycleHistoryPage } from '../model/types'
import { tradeKeys, type CycleHistoryKeyParams } from '../model/queryKeys'

export type DateParams = CycleHistoryKeyParams

export function useAccountCycleHistoryQuery(accountId: string, params: DateParams) {
  const { data, isLoading, isError, isFetchNextPageError, fetchNextPage, hasNextPage, isFetchingNextPage } =
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
  // "더 보기"·재조회 실패도 isError가 되지만, 이미 받은 페이지는 덮지 않도록 데이터가 없을 때만 오류로 넘긴다("더 보기" 실패는 isFetchNextPageError로 따로 안내)
  return { cycleHistory, isLoading, isError: isError && !data, isFetchNextPageError, fetchNextPage, hasNextPage, isFetchingNextPage }
}

export function useStrategyCycleHistoryQuery(strategyId: string | undefined, params: DateParams) {
  const { data, isLoading, isError, isFetchNextPageError, fetchNextPage, hasNextPage, isFetchingNextPage } =
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
  // "더 보기"·재조회 실패도 isError가 되지만, 이미 받은 페이지는 덮지 않도록 데이터가 없을 때만 오류로 넘긴다("더 보기" 실패는 isFetchNextPageError로 따로 안내)
  return { cycleHistory, isLoading, isError: isError && !data, isFetchNextPageError, fetchNextPage, hasNextPage, isFetchingNextPage }
}
