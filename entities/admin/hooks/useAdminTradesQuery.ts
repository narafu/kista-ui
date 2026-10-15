'use client'

import { useQuery } from '@tanstack/react-query'

import { listAdminAccounts } from '../api'
import { adminKeys } from '../model/queryKeys'
import { adminTradesQueryOptions } from '../model/queryOptions'
import type { AdminTradesQueryParams } from '../model/queryKeys'

export function useAdminTradesQuery(params?: AdminTradesQueryParams) {
  return useQuery(adminTradesQueryOptions(params))
}

// 재주문 대상 사용자 후보 — 기간 필터된 거래 목록이 아니라 전체 계좌의 소유자를 쓴다.
// useAdminAccountsByUserQuery와 같은 키·queryFn이라 사용자 선택 후 계좌 조회와 캐시를 공유한다.
export function useAdminAllAccountsQuery() {
  return useQuery({
    queryKey: adminKeys.accounts(),
    queryFn: () => listAdminAccounts(),
  })
}
