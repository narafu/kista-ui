export type BacktestType = 'INFINITE' | 'PRIVACY' | 'VR'

export interface BacktestParams {
  type: BacktestType
  ticker: string
  from: string
  to: string
  seed: number
  divisionCount?: number
  vrBandWidth?: number
  vrIntervalWeeks?: number
  vrRecurringAmount?: number
  vrInitialValue?: number
}

export interface BacktestPoint {
  date: string
  totalAsset: number
  principal: number
}

export interface BacktestSummary {
  finalAsset: number
  totalInvested: number
  totalReturnRate: number
  cagr: number | null
  mdd: number
  tradeCount: number
  cycleCount: number
}

export interface BacktestResult {
  points: BacktestPoint[]
  summary: BacktestSummary
  warnings: string[]
}
