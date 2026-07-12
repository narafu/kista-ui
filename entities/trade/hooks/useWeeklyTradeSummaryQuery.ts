'use client'

import { useQuery } from '@tanstack/react-query'
import { getDailyTransactions } from '../api'

export interface DayTradeSummary {
  tradeCount: number
  netAmountUsd: number // SELL 합산 − BUY 합산 (실현 손익 아님, 순거래 금액)
  buyCount: number
  sellCount: number
}

function pad(n: number) { return String(n).padStart(2, '0') }

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function useWeeklyTradeSummaryQuery(accountIds: string[], weekStart: Date) {
  const from = toDateStr(weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const to = toDateStr(weekEnd)

  return useQuery<Map<string, DayTradeSummary>>({
    queryKey: ['weeklyTrades', accountIds.join(','), from],
    queryFn: async () => {
      const results = await Promise.allSettled(
        accountIds.map(id => getDailyTransactions(id, { from, to })),
      )
      const map = new Map<string, DayTradeSummary>()
      for (const r of results) {
        if (r.status !== 'fulfilled') continue
        for (const item of r.value.items) {
          const dateKey = item.tradeDate // API가 항상 ISO YYYY-MM-DD 반환
          const prev = map.get(dateKey) ?? { tradeCount: 0, netAmountUsd: 0, buyCount: 0, sellCount: 0 }
          const isSell = item.direction === 'SELL'
          const sign = isSell ? 1 : -1
          map.set(dateKey, {
            tradeCount: prev.tradeCount + 1,
            netAmountUsd: prev.netAmountUsd + sign * item.tradeAmountUsd,
            buyCount: prev.buyCount + (isSell ? 0 : 1),
            sellCount: prev.sellCount + (isSell ? 1 : 0),
          })
        }
      }
      return map
    },
    staleTime: 1000 * 60 * 5,
    enabled: accountIds.length > 0,
  })
}
