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

export interface LedgerCheck {
  remainingLedger: number
  requiredBuyUsd: number
  sufficient: boolean // false면 그 사이클 신규 BUY 전체 거절
  trimmed: boolean    // true면 원장에 맞춰 BUY를 축소 접수 (부족 아님, 정보성)
}

export interface NextOrderPreview {
  tradeDate: string
  position: NextOrderPositionSnapshot | null
  orders: NextOrderItem[]
  skipReason: SkipReason | null
  todayOrders: PlacedOrder[]               // 오늘 이미 등록된 PLANNED + PLACED 주문 (없으면 빈 배열)
  otherStrategiesPlannedBuyUsd: string     // 계좌 내 타 전략 당일 PLANNED BUY 합계
  ledgerCheck: LedgerCheck | null          // 전략 원장 예수금 점검 결과 (DCA·신규 BUY 없음·skip이면 null)
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
