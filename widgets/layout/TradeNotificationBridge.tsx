'use client'

import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { TradeNotificationProvider, tradeKeys } from '@entities/trade'

// 체결로 값이 바뀌는 클라이언트 조회 키. stats의 housing·etf·regions 같은 외부 참조 데이터는 체결과 무관해 제외한다
export const TRADE_DEPENDENT_KEYS = [
  tradeKeys.all,
  orderKeys.all,
  statsKeys.summary(),
  statsKeys.equityCurveAll(),
  statsKeys.cyclesAll(),
] as const

export function invalidateTradeDependents(queryClient: QueryClient) {
  return Promise.all(
    TRADE_DEPENDENT_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey }).catch(() => null)),
  )
}

export function TradeNotificationBridge() {
  const queryClient = useQueryClient()
  return <TradeNotificationProvider onTrade={() => void invalidateTradeDependents(queryClient)} />
}
