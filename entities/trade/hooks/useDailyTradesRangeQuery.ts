'use client'

import { useQuery } from '@tanstack/react-query'
import type { Currency } from '@shared/lib/api-schema'
import { getDailyTransactionsBatch } from '../api'
import { tradeKeys } from '../model/queryKeys'
import type { DailyTransaction } from '../model/types'

/** 하루·한 통화의 체결 합계 — 통화가 다른 금액은 합치지 않는다 */
export interface CurrencyTradeSummary {
  currency: Currency
  buyAmount: number
  sellAmount: number
  buyCount: number
  sellCount: number
}

export interface DayTradeSummary {
  tradeCount: number
  byCurrency: CurrencyTradeSummary[] // 통화 선언 순서(KRW, USD, USDT)
}

const CURRENCY_ORDER: Currency[] = ['KRW', 'USD', 'USDT']

function pad(n: number) { return String(n).padStart(2, '0') }

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 체결 목록 → 날짜별(통화별) 합계 */
export function summarizeDailyTrades(items: DailyTransaction[]): Map<string, DayTradeSummary> {
  const map = new Map<string, DayTradeSummary>()
  for (const item of items) {
    const day = map.get(item.tradeDate) ?? { tradeCount: 0, byCurrency: [] }
    let cur = day.byCurrency.find((c) => c.currency === item.currency)
    if (!cur) {
      cur = { currency: item.currency, buyAmount: 0, sellAmount: 0, buyCount: 0, sellCount: 0 }
      day.byCurrency.push(cur)
      day.byCurrency.sort((a, b) => CURRENCY_ORDER.indexOf(a.currency) - CURRENCY_ORDER.indexOf(b.currency))
    }
    const amount = Number(item.tradeAmount)
    if (item.direction === 'SELL') {
      cur.sellAmount += amount
      cur.sellCount += 1
    } else {
      cur.buyAmount += amount
      cur.buyCount += 1
    }
    day.tradeCount += 1
    map.set(item.tradeDate, day)
  }
  return map
}

// 유저 스코프 배치 조회 — 지정 기간 전체를 1회 요청으로 가져와 날짜별 Map으로 반환
export function useDailyTradesRangeQuery(accountIds: string[], from: Date, to: Date) {
  const fromStr = toDateStr(from)
  const toStr = toDateStr(to)

  return useQuery<Map<string, DayTradeSummary>>({
    queryKey: tradeKeys.dailyRange(accountIds, fromStr, toStr),
    queryFn: async () => summarizeDailyTrades((await getDailyTransactionsBatch({ from: fromStr, to: toStr })).items),
    staleTime: 1000 * 60 * 5,
    enabled: accountIds.length > 0,
  })
}
