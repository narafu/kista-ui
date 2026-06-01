export interface NextOrderPositionSnapshot {
  ticker: string
  holdings: number
  averagePrice: string
  currentPrice: string
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

export type SkipReason = 'NO_CYCLE_HISTORY' | 'INSUFFICIENT_BALANCE' | 'NO_PRIVACY_BASE'

export interface NextOrderPreview {
  tradeDate: string
  position: NextOrderPositionSnapshot | null
  orders: NextOrderItem[]
  skipReason: SkipReason | null
}
