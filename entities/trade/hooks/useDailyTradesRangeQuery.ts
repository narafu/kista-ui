'use client'

import { useQuery } from '@tanstack/react-query'
import { getDailyTransactionsBatch } from '../api'
import { tradeKeys } from '../model/queryKeys'
import type { DayTradeSummary } from '../model/types'

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
    queryFn: async () => new Map((await getDailyTransactionsBatch({ from: fromStr, to: toStr })).byDate.map((d) => [d.date, d])),
    staleTime: 1000 * 60 * 5,
    enabled: accountIds.length > 0,
  })
}
