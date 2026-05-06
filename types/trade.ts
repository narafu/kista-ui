export interface TradeHistory {
  id: string
  accountId: string
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  amount: number
  executedAt: string
}

export interface PortfolioSnapshot {
  accountId: string
  symbol: string
  quantity: number
  avgPrice: number
  currentPrice: number
  evaluationAmount: number
  profitLoss: number
  profitLossRate: number
  snapshotAt: string
}

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
