import type { components } from '@shared/lib/api-types'
import type { Currency } from '@shared/lib/api-schema'

export type EtfBenchmarkSymbol = string

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
  availableCurrencies?: string[] // 사이클이 있는 실계좌 통화 — 서버 enum 순서, 요청 통화와 무관
}

export type EquityCurveParams = {
  from?: string
  to?: string
  type?: string
  currency?: Currency
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
  accountId: string
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

// GET /api/stats/cycles 필터 — 모두 AND 조합, ticker는 서버 StrategyTicker enum 값
export type CycleStatusFilter = 'ACTIVE' | 'CLOSED'

export type StatsCyclesFilters = {
  type?: string
  accountId?: string
  ticker?: string
  status?: CycleStatusFilter
  page?: number // 0-based
  size?: number
}

export interface CyclePerformancePage {
  items: CyclePerformance[]
  page: number
  totalElements: number
  totalPages: number
}

export type HousingBenchmarkParams =
  | {
      scope: 'PORTFOLIO' | 'STRATEGY'
      strategyId?: string
      benchmarkType: 'HOUSING'
      regionCode: string
      from?: string
      to?: string
      currency?: Currency // PORTFOLIO scope 합산 통화(생략 시 USD), STRATEGY는 서버가 무시
    }
  | {
      scope: 'PORTFOLIO' | 'STRATEGY'
      strategyId?: string
      benchmarkType: 'ETF'
      symbol: EtfBenchmarkSymbol
      from?: string
      to?: string
      currency?: Currency
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

export type HousingPriceIndexSeries = HousingBenchmarkSchemas['HousingPriceIndexSeriesResponse']

export type EtfPriceSeries = HousingBenchmarkSchemas['EtfPriceSeriesResponse']
