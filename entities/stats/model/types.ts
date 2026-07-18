export interface StrategyTypeStats {
  type: string
  typeDescription: string
  closedCycleCount: number
  activeCycleCount: number
  winRate: number | null
  avgReturnRate: number | null
  avgDurationDays: number | null
  realizedPnl: number
  unrealizedPnl: number
}

export interface StatsSummary {
  totalRealizedPnl: number
  totalUnrealizedPnl: number
  activePrincipal: number
  byType: StrategyTypeStats[]
}

export interface EquityPoint {
  date: string
  totalAsset: number
  principal: number
}

export interface EquityCurve {
  points: EquityPoint[]
}

export interface CyclePerformance {
  cycleId: string
  strategyType: string
  ticker: string | null
  startDate: string
  endDate: string | null
  startAmount: number
  endAmount: number | null
  pnl: number | null
  returnRate: number | null
  durationDays: number | null
  closed: boolean
}

export interface CyclePerformancePage {
  items: CyclePerformance[]
  nextCursor?: string | null
  hasMore: boolean
}
