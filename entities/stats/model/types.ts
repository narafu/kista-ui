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

export interface HousingBenchmarkParams {
  scope: 'PORTFOLIO' | 'STRATEGY'
  strategyId?: string
  quintile: 1 | 2 | 3 | 4 | 5
  from?: string
  to?: string
}

export interface CurrentExchangeRate {
  midRate: number
  fetchedAt: string
  source: 'TOSS_INVEST'
}

export interface HousingBenchmarkStrategy {
  id: string
  type: string
  ticker: string
}

export interface HousingBenchmark {
  regionCode: string
  regionName: string
  quintile: number
  label: string
  sourceUpdatedDate: string | null
}

export interface HousingBenchmarkPeriod {
  fromMonth: string | null
  toMonth: string | null
  monthCount: number
}

export interface HousingBenchmarkSummary {
  investmentCumulativeReturn: number
  benchmarkCumulativeReturn: number
  excessReturn: number
  investmentAnnualizedReturn: number
  benchmarkAnnualizedReturn: number
  investmentMaxDrawdown: number
  benchmarkMaxDrawdown: number
}

export interface HousingBenchmarkPoint {
  baseMonth: string
  investmentIndexUsd: number
  benchmarkIndex: number
  investmentMonthlyReturn: number | null
  benchmarkMonthlyReturn: number | null
}

export interface HousingBenchmarkQuality {
  method: string
  investmentCurrency: string
  benchmarkCurrency: string
  notice: string
}

export interface HousingBenchmarkComparison {
  scope: 'PORTFOLIO' | 'STRATEGY'
  strategy: HousingBenchmarkStrategy | null
  benchmark: HousingBenchmark
  period: HousingBenchmarkPeriod
  summary: HousingBenchmarkSummary | null
  points: HousingBenchmarkPoint[]
  currentExchangeRate: CurrentExchangeRate | null
  quality: HousingBenchmarkQuality
  emptyReason: string | null
}
