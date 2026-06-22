'use client'

import { useQuery } from '@tanstack/react-query'
import { getDailyTransactions } from '../api'

export interface DayTradeSummary {
  tradeCount: number
  netAmountUsd: number // SELL 합산 − BUY 합산 (실현 손익 아님, 순거래 금액)
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
          // KIS trad_dt는 'YYYYMMDD' 형식 → 달력 키('YYYY-MM-DD')로 변환
          const raw = item.tradeDate
          const dateKey = raw.length === 8 && !raw.includes('-')
            ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
            : raw
          const prev = map.get(dateKey) ?? { tradeCount: 0, netAmountUsd: 0 }
          const sign = item.direction === 'SELL' ? 1 : -1
          map.set(dateKey, {
            tradeCount: prev.tradeCount + 1,
            netAmountUsd: prev.netAmountUsd + sign * item.tradeAmountUsd,
          })
        }
      }
      return map
    },
    staleTime: 1000 * 60 * 5,
    enabled: accountIds.length > 0,
  })
}
