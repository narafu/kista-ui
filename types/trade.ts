export type OrderDirection = 'BUY' | 'SELL'
export type OrderType = 'LIMIT' | 'MARKET'
export type OrderStatus = 'SUBMITTED' | 'FILLED' | 'CANCELLED' | 'FAILED'

export interface TradeHistory {
  id: string
  tradeDate: string
  symbol: string
  strategy: string
  orderType: OrderType
  direction: OrderDirection
  qty: number
  price: number
  amountUsd: number
  status: OrderStatus
  kisOrderId: string | null
  createdAt: string
}

export interface PortfolioSnapshot {
  id: string
  snapshotDate: string
  symbol: string
  qty: number
  avgPrice: number
  currentPrice: number
  marketValueUsd: number
  usdDeposit: number
  totalAssetUsd: number
  createdAt: string
}

// KIS API 통계 응답 (상세 형태 미정 - 추후 업데이트)
export interface ProfitSummary {
  accountId: string
  startDate: string
  endDate: string
  totalProfitLoss: number
  totalProfitLossRate: number
  dailyProfits: DailyProfit[]
}

export interface DailyProfit {
  date: string
  profitLoss: number
  profitLossRate: number
}
