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
  // 중간부터 시작 — 기존 보유 수량·평단가 (세 전략 공통, 미지정이면 빈 포지션에서 시작)
  initialHoldings?: number
  initialAvgPrice?: number
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
