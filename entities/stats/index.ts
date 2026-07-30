export type {
  StrategyTypeStats,
  StatsSummary,
  EquityPoint,
  EquityCurve,
  CyclePerformance,
  CyclePerformancePage,
  BenchmarkAssetType,
  EtfBenchmarkSymbol,
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
  HousingBenchmarkRegion,
  HousingBenchmarkRegionsList,
} from './model/types'
export { statsKeys } from './model/queryKeys'
export {
  getStatsSummary,
  getEquityCurve,
  getStatsCycles,
  getHousingBenchmarkComparison,
  getHousingBenchmarkSeries,
  getHousingBenchmarkRegions,
} from './api'
export {
  useStatsSummaryQuery,
  useEquityCurveQuery,
  useHousingBenchmarkQuery,
  useHousingBenchmarkSeriesQuery,
  useHousingBenchmarkRegionsQuery,
  useStatsCyclesQuery,
} from './hooks/useStatsQueries'
export type { EquityCurveParams, HousingBenchmarkSeriesParams } from './hooks/useStatsQueries'
