export type {
  StrategyTypeStats,
  StatsSummary,
  EquityPoint,
  EquityCurve,
  CyclePerformance,
  CyclePerformancePage,
  HousingBenchmarkParams,
  CurrentExchangeRate,
  HousingBenchmarkStrategy,
  HousingBenchmark,
  HousingBenchmarkPeriod,
  HousingBenchmarkSummary,
  HousingBenchmarkPoint,
  HousingBenchmarkQuality,
  HousingBenchmarkComparison,
  HousingBenchmarkSeriesPoint,
  HousingBenchmarkSeries,
} from './model/types'
export {
  getStatsSummary,
  getEquityCurve,
  getStatsCycles,
  getHousingBenchmarkComparison,
  getHousingBenchmarkSeries,
} from './api'
export {
  useStatsSummaryQuery,
  useEquityCurveQuery,
  useHousingBenchmarkQuery,
  useHousingBenchmarkSeriesQuery,
  useStatsCyclesQuery,
} from './hooks/useStatsQueries'
export type { EquityCurveParams, HousingBenchmarkSeriesParams } from './hooks/useStatsQueries'
