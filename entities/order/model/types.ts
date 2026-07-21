export interface NextOrderPositionSnapshot {
  ticker: string
  holdings: number
  averagePrice: string  // 0회차: 전일종가, 이후: 평균 매입가
  usdDeposit: string
  totalAssets: string
  priceOffsetRate: string
  currentRound: number
  unitAmount: string
  referencePrice: string
  targetPrice: string
}

export interface NextOrderItem {
  ticker: string
  orderType: string
  direction: string
  quantity: number
  price: string
}

export type { SkipReason } from '@shared/lib/api-schema'
import type { SkipReason } from '@shared/lib/api-schema'
export type { PlacedOrder } from '@shared/model/placed-order'
import type { PlacedOrder } from '@shared/model/placed-order'

export interface CompetingStrategy {
  strategyId: string
  type: string
  ticker: string
  requiredBuyUsd: string
  priority: number
}

export interface BuyCompetitionSummary {
  sufficientBudget: boolean
  availableDeposit: string
  requiredForThisStrategy: string
  consumedByHigherPriority: string
  blockedByHigherPriority: CompetingStrategy[]
  uncertainStrategyIds: string[]
  liveBalanceUnavailable: boolean   // 라이브 예수금 조회 자체 실패 시 true — sufficientBudget/availableDeposit 신뢰 불가
}

export interface NextOrderPreview {
  tradeDate: string
  position: NextOrderPositionSnapshot | null
  orders: NextOrderItem[]
  skipReason: SkipReason | null
  todayOrders: PlacedOrder[]               // 오늘 이미 등록된 PLANNED + PLACED 주문 (없으면 빈 배열)
  otherStrategiesPlannedBuyUsd: string     // 계좌 내 타 전략 당일 PLANNED BUY 합계
  competition: BuyCompetitionSummary | null // 계좌 내 BUY 예산 경쟁 시뮬레이션 결과 (BUY 없으면 null)
}

export interface StrategyOrder {
  id: string
  tradeDate: string
  direction: 'BUY' | 'SELL'
  orderType: string
  quantity: number
  price: string
  status: string
  filledQuantity: number | null
  filledPrice: string | null
}
