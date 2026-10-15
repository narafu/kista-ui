'use client'

import { useState } from 'react'
import { useInfiniteQuery, type InfiniteData, type UseInfiniteQueryResult } from '@tanstack/react-query'
import { getAccountCycleHistory, getStrategyCycleHistory } from '../api'
import type { CycleHistoryItem, CycleHistoryPage } from '../model/types'
import { tradeKeys, type CycleHistoryKeyParams } from '../model/queryKeys'

export type DateParams = CycleHistoryKeyParams

export function useAccountCycleHistoryQuery(accountId: string, params: DateParams) {
  const query = useInfiniteQuery<CycleHistoryPage, Error, InfiniteData<CycleHistoryPage>>({
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
  return useCycleHistoryResult(query, `${accountId}:${JSON.stringify(params)}`)
}

export function useStrategyCycleHistoryQuery(strategyId: string | undefined, params: DateParams) {
  const query = useInfiniteQuery<CycleHistoryPage, Error, InfiniteData<CycleHistoryPage>>({
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
  return useCycleHistoryResult(query, `${strategyId}:${JSON.stringify(params)}`)
}

function useCycleHistoryResult(query: UseInfiniteQueryResult<InfiniteData<CycleHistoryPage>>, scope: string) {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = query
  // RQ의 isFetchNextPageError는 다른 재조회(포커스·무효화)가 fetchMeta를 지우면 꺼진다 —
  // "더 보기" 클릭 결과로 직접 기록해 다음 클릭이나 조회 조건(scope) 변경 전까지 안내를 유지한다
  const [failedScope, setFailedScope] = useState<string | null>(null)

  async function loadNextPage() {
    setFailedScope(null)
    const result = await fetchNextPage()
    if (result.isFetchNextPageError) setFailedScope(scope)
  }

  const cycleHistory: CycleHistoryItem[] = data?.pages.flatMap((p) => p.items) ?? []
  return {
    cycleHistory,
    isLoading,
    // "더 보기"·재조회 실패도 isError가 되지만, 이미 받은 페이지는 덮지 않도록 데이터가 없을 때만 오류로 넘긴다
    isError: isError && !data,
    isFetchNextPageError: failedScope === scope,
    fetchNextPage: loadNextPage,
    hasNextPage,
    isFetchingNextPage,
  }
}
