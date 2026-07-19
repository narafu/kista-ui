import type { components } from '@shared/lib/api-types'

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

export type BenchmarkAssetType = 'HOUSING' | 'ETF'
export type EtfBenchmarkSymbol = 'SPY' | 'QQQ' | 'QLD' | 'IBIT'

// TODO(백엔드 완료 후): npm run fetch:spec && npm run gen:types로 실제 openapi 타입과 동기화.
// 아래 판별 유니온은 아직 openapi.json에 반영되지 않은 확정 계약(benchmarkType/symbol)을 직접 반영한 임시 타입이다.
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

// TODO(백엔드 완료 후): npm run fetch:spec && npm run gen:types로 실제 openapi 타입과 동기화.
// assetType/symbol 등 아직 openapi.json에 반영되지 않은 신규 필드를 직접 정의한 임시 타입이다.
export interface HousingBenchmark {
  assetType: BenchmarkAssetType
  regionCode: string | null
  regionName: string | null
  quintile: number | null
  symbol: string | null
  label: string
  sourceUpdatedDate: string | null
}

export type HousingBenchmarkPeriod = HousingBenchmarkSchemas['HousingBenchmarkPeriod']
export type HousingBenchmarkSummary = HousingBenchmarkSchemas['HousingBenchmarkSummary']
export type HousingBenchmarkPoint = HousingBenchmarkSchemas['HousingBenchmarkPoint']

// TODO(백엔드 완료 후): npm run fetch:spec && npm run gen:types로 실제 openapi 타입과 동기화.
// benchmarkCurrency에 'USD'가 추가되는 신규 계약을 직접 정의한 임시 타입이다.
export interface HousingBenchmarkQuality {
  method?: string
  investmentCurrency?: string
  benchmarkCurrency?: 'USD' | 'KRW'
  notice?: string
}

// benchmark/quality는 위에서 직접 정의한 신규 임시 타입으로 교체 — 나머지 필드는 생성 타입을 그대로 재사용한다.
export type HousingBenchmarkComparison = Omit<
  HousingBenchmarkSchemas['HousingBenchmarkComparisonResponse'],
  'benchmark' | 'quality'
> & {
  benchmark?: HousingBenchmark
  quality?: HousingBenchmarkQuality
}

export type HousingBenchmarkSeriesPoint = HousingBenchmarkSchemas['HousingBenchmarkSeriesPoint']
export type HousingBenchmarkSeries = HousingBenchmarkSchemas['HousingBenchmarkSeriesResponse']
export type HousingBenchmarkRegion = HousingBenchmarkSchemas['HousingBenchmarkRegionItem']
export type HousingBenchmarkRegionsList = HousingBenchmarkSchemas['HousingBenchmarkRegionsResponse']
