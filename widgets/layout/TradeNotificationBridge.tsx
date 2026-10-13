'use client'

import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { strategyKeys } from '@entities/strategy'
import { TradeNotificationProvider, tradeKeys } from '@entities/trade'

// 체결로 값이 바뀌는 조회 키. tradeKeys.all은 계좌 포트폴리오(예수금·평가금)를, strategy list·detail은 currentRound·currentHoldings를 포함한다.
// strategy lists는 details보다 먼저 무효화해야 한다 — detail queryFn이 목록 캐시를 거치므로 순서가 바뀌면 갱신 전 목록을 재사용한다.
// strategy seed-preview는 시세 기반이라 제외한다(전략 폼이 열린 중 재조회되면 minSeed 변경으로 사용자가 조정한 시드가 초기화될 수 있다).
// housing-comparison은 내 투자 수익률을 포함해 대상이고, stats의 housing·etf 시장 시계열과 regions 같은 외부 참조 데이터는 체결과 무관해 제외한다
export const TRADE_DEPENDENT_KEYS = [
  tradeKeys.all,
  strategyKeys.lists(),
  strategyKeys.details(),
  orderKeys.all,
  statsKeys.summary(),
  statsKeys.equityCurveAll(),
  statsKeys.cyclesAll(),
  statsKeys.housingComparisonAll(),
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
