export interface TradeEvent {
  kind: 'BUY' | 'SELL' | 'INFO' | 'FAIL'
  ticker: string
  quantity?: number
  price?: number
  amount?: number
  time: string
  accountNickname: string
  message?: string
}

export type OrderDirection = 'BUY' | 'SELL'
export type OrderType = 'LOC' | 'MOC' | 'LIMIT'
export type OrderStatus = 'PLACED' | 'FILLED' | 'FAILED' | 'CANCELLED'

export interface TradeHistory {
  id: string
  tradeDate: string
  ticker: string
  orderType: OrderType
  direction: OrderDirection
  quantity: number
  price: number
  status: OrderStatus
  kisOrderId: string | null
}

export interface CycleHistoryItem {
  createdAt: string
  ticker: string | null
  holdings: number
  avgPrice: number | null
  usdDeposit: number
}

export interface CycleHistoryPage {
  items: CycleHistoryItem[]
  nextCursor: string | null
  hasMore: boolean
}

export interface Execution {
  tradeDate: string
  ticker: string
  direction: OrderDirection
  quantity: number
  price: number
  kisOrderId: string | null
}

export interface PortfolioSnapshot {
  id: string
  ticker: string
  holdings: number
  avgPrice: number | null
  closingPrice: number | null
  marketValueUsd: number
  usdDeposit: number
  totalAssetUsd: number
  createdAt: string
}

export interface DailyProfit {
  date: string
  profitLoss: number
  profitLossRate: number
}

export interface ProfitSummary {
  accountId: string
  startDate: string
  endDate: string
  totalProfitLoss?: number
  totalProfitLossRate?: number
  dailyProfits: DailyProfit[]
  totalRealizedProfit?: number
  totalReturnRate?: number
}

export interface MarginItem {
  currency: string
  integratedOrderableAmount: number
  foreignOrderableAmount: number
  purchasableAmount: number
}

export interface DailyTransaction {
  tradeDate: string
  settlementDate: string
  direction: OrderDirection
  ticker: string
  symbolName: string
  quantity: number
  price: number
  tradeAmountUsd: number
  settlementAmountKrw: number
  exchangeRate: number
  currency: string
}

export interface DailyTransactionSummary {
  buyAmountFcr: number
  sellAmountFcr: number
  domesticFee: number
  overseasFee: number
}

export interface DailyTransactionResult {
  items: DailyTransaction[]
  summary: DailyTransactionSummary
}
