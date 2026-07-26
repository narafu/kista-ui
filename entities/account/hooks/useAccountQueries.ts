'use client'

import { queryOptions, useQuery } from '@tanstack/react-query'

import { listAccounts } from '../api'
import type { Account } from '../model/types'
import { accountKeys } from '../model/queryKeys'

export function accountListQueryOptions(token?: string) {
  return queryOptions<Account[]>({
    queryKey: accountKeys.list(),
    queryFn: () => listAccounts(token),
  })
}

export function useAccountsQuery() {
  return useQuery(accountListQueryOptions())
}
