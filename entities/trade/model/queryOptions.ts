import { queryOptions } from '@tanstack/react-query'

import { getAccountPortfolio, getCryptoPortfolio, getCryptoPrices } from '../api'
import { tradeKeys } from './queryKeys'
import type { CryptoPortfolio, PortfolioSummary } from './types'

// server-safe(no 'use client'): Server Component는 token으로 prefetchQuery, Client Component는 token 없이 useQuery
export function accountPortfolioQueryOptions(accountId: string, token?: string) {
  return queryOptions<PortfolioSummary>({
    queryKey: tradeKeys.portfolio(accountId),
    queryFn: () => getAccountPortfolio(accountId, token),
  })
}

export function cryptoPortfolioQueryOptions(accountId: string, token?: string) {
  return queryOptions<CryptoPortfolio>({
    queryKey: tradeKeys.cryptoPortfolio(accountId),
    queryFn: () => getCryptoPortfolio(accountId, token),
  })
}

export function cryptoPricesQueryOptions(accountId: string, tickers: string[], token?: string) {
  return queryOptions<Record<string, number>>({
    queryKey: tradeKeys.cryptoPrices(accountId, tickers),
    queryFn: () => getCryptoPrices(accountId, tickers, token),
  })
}
