import { queryOptions } from '@tanstack/react-query'

import { getAccountPortfolio } from '../api'
import { tradeKeys } from './queryKeys'
import type { PortfolioSummary } from './types'

// server-safe(no 'use client'): Server Component는 token으로 prefetchQuery, Client Component는 token 없이 useQuery
export function accountPortfolioQueryOptions(accountId: string, token?: string) {
  return queryOptions<PortfolioSummary>({
    queryKey: tradeKeys.portfolio(accountId),
    queryFn: () => getAccountPortfolio(accountId, token),
  })
}
