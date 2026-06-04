'use client'

import { useQuery } from '@tanstack/react-query'
import { getAccountProfit, getPortfolioSnapshots } from '../api'
import type { ProfitSummary, PortfolioSnapshot } from '../model/types'

type Period = 7 | 30 | 90

function getDateRange(days: Period) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return {
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0],
  }
}

export function useProfitStatsQuery(accountId: string, period: Period) {
  const dateRange = getDateRange(period)

  const { data: profit, isLoading: l1 } = useQuery<ProfitSummary | null>({
    queryKey: ['profit', accountId, period],
    queryFn: () => getAccountProfit(accountId, dateRange).catch(() => null),
  })

  const { data: snapshots = [], isLoading: l2 } = useQuery<PortfolioSnapshot[]>({
    queryKey: ['snapshots', accountId, period],
    queryFn: () =>
      getPortfolioSnapshots({ from: dateRange.from, to: dateRange.to }).catch(
        (): PortfolioSnapshot[] => [],
      ),
  })

  return { profit: profit ?? null, snapshots, isLoading: l1 || l2 }
}
