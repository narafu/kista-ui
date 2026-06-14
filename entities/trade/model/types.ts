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

export type { OrderDirection, OrderType, OrderStatus } from '@shared/lib/api-schema'
import type { OrderDirection, OrderType, OrderStatus } from '@shared/lib/api-schema'

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

export interface PortfolioSummary {
  positions?: Array<{
    ticker?: string | null
    holdings?: number | null
    avgPrice?: number | string | null
    currentPrice?: number | string | null
    evalAmountUsd?: number | string | null
    profitLossUsd?: number | string | null
    profitRate?: number | string | null
    exchangeCode?: string | null
  }>
  summary?: {
    totalAssetUsd?: number | string | null
    totalEvalProfit?: number | string | null
    totalReturnRate?: number | string | null
    totalAssetUsdActual?: number | string | null
    evalProfitUsdSum?: number | string | null
    usdDeposit?: number | string | null
    posEvalUsd?: number | string | null
    exchangeRateKrwPerUsd?: number | string | null
  }
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
