import type { components } from '@shared/lib/api-types'
import type { BenchmarkAssetType, EtfBenchmarkSymbol } from '@shared/lib/api-schema'

export type { BenchmarkAssetType, EtfBenchmarkSymbol }

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

export type HousingBenchmarkParams =
  | {
      scope: 'PORTFOLIO' | 'STRATEGY'
      strategyId?: string
      benchmarkType: 'HOUSING'
      quintile: 1 | 2 | 3 | 4 | 5
      from?: string
      to?: string
    }
  | {
      scope: 'PORTFOLIO' | 'STRATEGY'
      strategyId?: string
      benchmarkType: 'ETF'
      symbol: EtfBenchmarkSymbol
      from?: string
      to?: string
    }

type HousingBenchmarkSchemas = components['schemas']

export type CurrentExchangeRate = HousingBenchmarkSchemas['HousingBenchmarkCurrentExchangeRate']
export type HousingBenchmarkStrategy = HousingBenchmarkSchemas['HousingBenchmarkStrategyInfo']

export type HousingBenchmark = HousingBenchmarkSchemas['HousingBenchmarkDefinition']
export type HousingBenchmarkPeriod = HousingBenchmarkSchemas['HousingBenchmarkPeriod']
export type HousingBenchmarkSummary = HousingBenchmarkSchemas['HousingBenchmarkSummary']
export type HousingBenchmarkPoint = HousingBenchmarkSchemas['HousingBenchmarkPoint']
export type HousingBenchmarkQuality = HousingBenchmarkSchemas['HousingBenchmarkQuality']
export type HousingBenchmarkComparison = HousingBenchmarkSchemas['HousingBenchmarkComparisonResponse']

export type HousingBenchmarkSeriesPoint = HousingBenchmarkSchemas['HousingBenchmarkSeriesPoint']
export type HousingBenchmarkSeries = HousingBenchmarkSchemas['HousingBenchmarkSeriesResponse']
export type HousingBenchmarkRegion = HousingBenchmarkSchemas['HousingBenchmarkRegionItem']
export type HousingBenchmarkRegionsList = HousingBenchmarkSchemas['HousingBenchmarkRegionsResponse']
