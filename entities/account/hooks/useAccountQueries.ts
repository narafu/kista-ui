'use client'

import { useQuery } from '@tanstack/react-query'

import { accountDetailQueryOptions, accountListQueryOptions } from '../model/queryOptions'

export function useAccountsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    ...accountListQueryOptions(),
    enabled: options?.enabled ?? true,
  })
}

export function useAccountDetailQuery(accountId: string) {
  return useQuery(accountDetailQueryOptions(accountId))
}
