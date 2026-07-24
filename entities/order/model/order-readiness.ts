import { toNum } from '@shared/lib/utils'
import type { NextOrderPreview } from './types'

export interface DirectionReadiness {
  hasOrders: boolean
  unplaced: boolean    // 계획엔 있는데 오늘 실제 미접수 (오늘 시도 자체가 없으면 false)
  hasDeficit: boolean  // 라이브 예산/판매가능수량 부족 (신뢰 가능한 경우만 true — uncertain이면 항상 false)
  uncertain: boolean   // 라이브 조회 자체 실패 — 부족/충족 판정 불가
  deficitAmount: number // hasDeficit일 때만 의미 있음, 그 외 0
}

export interface OrderReadiness {
  buy: DirectionReadiness
  sell: DirectionReadiness
}

// 우선순위/경쟁 앞선 소요분 + 이 전략 필요분 - 가용분 = 부족분 — BUY 예산 경쟁과 SELL 판매가능수량
// 경쟁이 동일한 "선점분 + 필요분 - 가용분" 형태이므로 공유한다
function computeDeficit(consumedByOthers: number, requiredByThis: number, available: number): number {
  return Math.max(0, consumedByOthers + requiredByThis - available)
}

// 카드/상세 두 위젯이 공유하는 순수 판정 로직 — BUY/SELL 각 방향에 대해 "오늘 계획된 주문 중
// 실제 미접수 방향인가"를 plannedDirections(orders) vs placedDirections(todayOrders)로 판정하고,
// 라이브 잔고/판매가능수량 부족 여부를 함께 계산한다
export function computeOrderReadiness(preview: NextOrderPreview | undefined): OrderReadiness {
  const orders = preview?.orders ?? []
  const todayOrders = preview?.todayOrders ?? []
  const competition = preview?.competition ?? null
  const sellSufficiency = preview?.sellSufficiency ?? null
  const hasTodayOrders = todayOrders.length > 0

  const plannedDirections = new Set(orders.map((o) => o.direction))
  const placedDirections = new Set(todayOrders.map((o) => o.direction))

  const hasBuyOrders = plannedDirections.has('BUY')
  const hasSellOrders = plannedDirections.has('SELL')

  const buy: DirectionReadiness = {
    hasOrders: hasBuyOrders,
    unplaced: hasTodayOrders && hasBuyOrders && !placedDirections.has('BUY'),
    hasDeficit: hasBuyOrders && competition ? !competition.sufficientBudget : false,
    uncertain: competition?.liveBalanceUnavailable ?? false,
    deficitAmount: competition
      ? computeDeficit(toNum(competition.consumedByHigherPriority), toNum(competition.requiredForThisStrategy), toNum(competition.availableDeposit))
      : 0,
  }

  const sell: DirectionReadiness = {
    hasOrders: hasSellOrders,
    unplaced: hasTodayOrders && hasSellOrders && !placedDirections.has('SELL'),
    hasDeficit: hasSellOrders && sellSufficiency ? !sellSufficiency.sufficientQuantity : false,
    uncertain: sellSufficiency?.liveQuantityUnavailable ?? false,
    deficitAmount: sellSufficiency
      ? computeDeficit(sellSufficiency.reservedQuantity, sellSufficiency.requiredQuantity, sellSufficiency.sellableQuantity)
      : 0,
  }

  return { buy, sell }
}
