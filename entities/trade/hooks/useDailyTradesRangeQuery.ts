'use client'

import { useQuery } from '@tanstack/react-query'
import { getDailyTransactionsBatch } from '../api'
import { tradeKeys } from '../model/queryKeys'

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

// 유저 스코프 배치 조회 — 지정 기간 전체를 1회 요청으로 가져와 날짜별 Map으로 반환
export function useDailyTradesRangeQuery(accountIds: string[], from: Date, to: Date) {
  const fromStr = toDateStr(from)
  const toStr = toDateStr(to)

  return useQuery<Map<string, DayTradeSummary>>({
    queryKey: tradeKeys.dailyRange(accountIds, fromStr, toStr),
    queryFn: async () => {
      const result = await getDailyTransactionsBatch({ from: fromStr, to: toStr })
      const map = new Map<string, DayTradeSummary>()
      for (const item of result.items) {
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
      return map
    },
    staleTime: 1000 * 60 * 5,
    enabled: accountIds.length > 0,
  })
}
