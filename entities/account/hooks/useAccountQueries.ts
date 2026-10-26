'use client'

import { useQuery } from '@tanstack/react-query'

import { accountDetailQueryOptions, accountListQueryOptions } from '../model/queryOptions'
import { sortMockLast } from '../model/sortAccounts'

export function useAccountsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    ...accountListQueryOptions(),
    // 모의계좌를 항상 마지막에 — 계좌를 나열하는 모든 화면(목록·필터·선택지)이 이 순서를 따른다.
    // 캐시는 서버 순서 그대로라 등록·수정 후 캐시 갱신(upsert)이 섞어 놓아도 다시 정렬된다
    select: sortMockLast,
    enabled: options?.enabled ?? true,
  })
}

export function useAccountDetailQuery(accountId: string) {
  return useQuery(accountDetailQueryOptions(accountId))
}
