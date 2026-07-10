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

export interface DailyTransaction {
  tradeDate: string
  direction: OrderDirection
  ticker: string
  symbolName: string
  quantity: number
  price: number
  tradeAmountUsd: number
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
