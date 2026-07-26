'use client'

import { useQuery } from '@tanstack/react-query'

import { accountListQueryOptions } from '../model/queryOptions'

export function useAccountsQuery() {
  return useQuery(accountListQueryOptions())
}
