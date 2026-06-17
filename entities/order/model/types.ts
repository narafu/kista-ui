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

export interface NextOrderPreview {
  tradeDate: string
  position: NextOrderPositionSnapshot | null
  orders: NextOrderItem[]
  skipReason: SkipReason | null
  todayOrders: PlacedOrder[]  // 오늘 이미 등록된 PLANNED 주문 (없으면 빈 배열)
  balanceDeficit: string | null  // null: 정상 or 기타 skip, '0'+: 매수 부족 금액 (USD)
}

export interface PlacedOrder {
  id: string
  ticker: string
  direction: 'BUY' | 'SELL'
  orderType: string
  quantity: number
  price: string
}
