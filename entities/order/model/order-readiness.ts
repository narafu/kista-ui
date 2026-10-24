import type { LedgerCheck, NextOrderPreview } from './types'

export interface DirectionReadiness {
  hasOrders: boolean
  unplaced: boolean    // 계획엔 있는데 오늘 실제 미접수 (오늘 시도 자체가 없으면 false)
}

export interface OrderReadiness {
  buy: DirectionReadiness
  sell: DirectionReadiness
  ledgerShortfall: LedgerCheck | null // 전략 원장 예수금 부족으로 신규 BUY 전체 거절 (BUY 계획이 있고 sufficient=false일 때만)
  ledgerTrimmed: boolean              // 원장에 맞춰 BUY를 줄여 접수 (부족 아님, 정보성)
}

// 카드/상세 두 위젯이 공유하는 순수 판정 로직 — BUY/SELL 각 방향에 대해 "오늘 계획된 주문 중
// 실제 미접수 방향인가"를 plannedDirections(orders) vs placedDirections(todayOrders)로 판정하고,
// 서버가 내려준 전략 원장 점검(ledgerCheck) 결과를 BUY 계획과 함께 해석한다
export function computeOrderReadiness(preview: NextOrderPreview | undefined): OrderReadiness {
  const orders = preview?.orders ?? []
  const todayOrders = preview?.todayOrders ?? []
  const ledgerCheck = preview?.ledgerCheck ?? null
  const hasTodayOrders = todayOrders.length > 0

  const plannedDirections = new Set(orders.map((o) => o.direction))
  const placedDirections = new Set(todayOrders.map((o) => o.direction))

  const hasBuyOrders = plannedDirections.has('BUY')
  const hasSellOrders = plannedDirections.has('SELL')

  return {
    buy: {
      hasOrders: hasBuyOrders,
      unplaced: hasTodayOrders && hasBuyOrders && !placedDirections.has('BUY'),
    },
    sell: {
      hasOrders: hasSellOrders,
      unplaced: hasTodayOrders && hasSellOrders && !placedDirections.has('SELL'),
    },
    ledgerShortfall: hasBuyOrders && ledgerCheck?.sufficient === false ? ledgerCheck : null,
    ledgerTrimmed: hasBuyOrders && ledgerCheck?.sufficient === true && ledgerCheck.trimmed,
  }
}
