import { toNum } from '@shared/lib/utils'
import type { NextOrderPreview } from './types'

export interface BuyReadiness {
  hasBuyOrders: boolean
  hasDeficit: boolean           // 라이브 예산 부족 (신뢰 가능한 경우만 true — liveBalanceUncertain이면 항상 false)
  buyUnplaced: boolean          // 계획엔 있는데 오늘 실제 미접수 (오늘 시도 자체가 없으면 false)
  sellUnplaced: boolean
  liveBalanceUncertain: boolean // 라이브 예수금 조회 자체 실패 — 부족/충족 판정 불가
  deficitUsd: number            // hasDeficit일 때만 의미 있음, 그 외 0
}

// 카드/상세 두 위젯이 공유하는 순수 판정 로직 — "오늘 계획된 주문 중 실제 미접수 방향이 있는가"를
// plannedDirections(orders) vs placedDirections(todayOrders)로 판정한다
export function computeBuyReadiness(preview: NextOrderPreview | undefined): BuyReadiness {
  const orders = preview?.orders ?? []
  const todayOrders = preview?.todayOrders ?? []
  const competition = preview?.competition ?? null
  const hasTodayOrders = todayOrders.length > 0

  const plannedDirections = new Set(orders.map((o) => o.direction))
  const placedDirections = new Set(todayOrders.map((o) => o.direction))

  const hasBuyOrders = plannedDirections.has('BUY')
  const hasDeficit = hasBuyOrders && competition ? !competition.sufficientBudget : false
  const liveBalanceUncertain = competition?.liveBalanceUnavailable ?? false
  // 우선순위 앞선 경쟁 전략 소요액 + 이 전략 필요액 - 가용예수금 = 부족액
  const deficitUsd = competition
    ? Math.max(0, toNum(competition.consumedByHigherPriority) + toNum(competition.requiredForThisStrategy) - toNum(competition.availableDeposit))
    : 0

  return {
    hasBuyOrders,
    hasDeficit,
    buyUnplaced: hasTodayOrders && plannedDirections.has('BUY') && !placedDirections.has('BUY'),
    sellUnplaced: hasTodayOrders && plannedDirections.has('SELL') && !placedDirections.has('SELL'),
    liveBalanceUncertain,
    deficitUsd,
  }
}
