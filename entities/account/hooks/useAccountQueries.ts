'use client'

import { useQuery } from '@tanstack/react-query'

import { accountDetailQueryOptions, accountListQueryOptions } from '../model/queryOptions'

export function useAccountsQuery() {
  return useQuery(accountListQueryOptions())
}

export function useAccountDetailQuery(accountId: string) {
  return useQuery(accountDetailQueryOptions(accountId))
}
