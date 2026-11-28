'use client'

import { useState } from 'react'
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'
import { listFinanceTransactions } from '../api'
import { financeKeys, type TransactionListKeyParams } from '../model/queryKeys'
import type { FinanceTransactionPage } from '../model/types'

// 거래 목록(커서 페이지형). 필터·정렬은 전부 서버 파라미터다 — 커서는 같은 sort에서만 유효하므로(다르면 400)
// 조건이 바뀌면 새 키로 첫 페이지부터 받는다. 새 키 첫 응답 전에는 이전 조건의 목록을 보이고
// (isPlaceholderData) 그동안 호출부가 "더 보기"를 막아야 한다.
export function useFinanceTransactionsInfiniteQuery(params: TransactionListKeyParams, { enabled = true }: { enabled?: boolean } = {}) {
  const { data, isLoading, isError, isPlaceholderData, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<FinanceTransactionPage, Error, InfiniteData<FinanceTransactionPage>>({
      queryKey: financeKeys.transactions(params),
      queryFn: ({ pageParam }) => listFinanceTransactions({ ...params, cursor: pageParam as string | undefined }),
      initialPageParam: undefined,
      getNextPageParam: (last) => (last.hasMore ? (last.nextCursor ?? undefined) : undefined),
      placeholderData: (prev) => prev,
      enabled,
    })

  // RQ의 isFetchNextPageError는 다른 재조회(포커스·무효화)가 fetchMeta를 지우면 꺼진다 —
  // "더 보기" 클릭 결과로 직접 기록해 다음 클릭이나 조회 조건(scope) 변경 전까지 안내를 유지한다
  const scope = JSON.stringify(params)
  const [failedScope, setFailedScope] = useState<string | null>(null)

  async function loadNextPage() {
    setFailedScope(null)
    const result = await fetchNextPage({ cancelRefetch: false }) // 무효화 재조회를 취소하고 낡은 커서로 이어 붙이지 않는다
    if (result.isFetchNextPageError) setFailedScope(scope)
  }

  return {
    transactions: data?.pages.flatMap((p) => p.items) ?? [],
    isLoading,
    // "더 보기"·재조회 실패도 isError가 되지만, 이미 받은 페이지는 덮지 않도록 데이터가 없을 때만 오류로 넘긴다
    isError: isError && !data,
    isPlaceholderData,
    isFetching,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError: failedScope === scope,
    fetchNextPage: loadNextPage,
  }
}
