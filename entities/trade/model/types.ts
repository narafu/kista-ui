export interface TradeEvent {
  kind: 'BUY' | 'SELL' | 'INFO' | 'FAIL'
  ticker: string
  quantity?: number
  price?: number
  currency?: Currency | null // price 통화 — 없으면 USD(주식)로 본다
  amount?: number
  time: string
  accountNickname: string
  message?: string
}

export type { OrderDirection } from '@shared/lib/api-schema'
import type { Currency, OrderDirection } from '@shared/lib/api-schema'

export interface CycleHistoryItem {
  createdAt: string
  ticker: string | null
  holdings: number
  avgPrice: number | null
  deposit: number
  strategyType?: string | null // INFINITE|PRIVACY|VR|DCA, null = unknown
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
    avgPrice?: number | null
    currentPrice?: number | null
    evalAmountUsd?: number | null
    profitLossUsd?: number | null
    profitRate?: number | null
    exchangeCode?: string | null
  }>
  summary?: {
    totalAsset?: number | null
    totalEvalProfit?: number | null
    totalReturnRate?: number | null
    totalAssetActual?: number | null
    evalProfitUsdSum?: number | null
    deposit?: number | null
    posEvalUsd?: number | null
    exchangeRateKrwPerUsd?: number | null
  }
}

export interface DailyTransaction {
  tradeDate: string
  direction: OrderDirection
  ticker: string
  symbolName: string
  quantity: number
  price: number
  tradeAmount: number // 계좌 통화, 그 통화 단위로 반올림됨
  currency: Currency // 계좌 통화
}

export interface DailyTransactionResult {
  items: DailyTransaction[]
}
