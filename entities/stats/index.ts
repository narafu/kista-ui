export type {
  StrategyTypeStats,
  StatsSummary,
  EquityPoint,
  EquityCurve,
  BenchmarkAssetType,
  EtfBenchmarkSymbol,
  HousingBenchmarkParams,
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
  HousingPriceIndexSeriesPoint,
  EtfPriceSeriesPoint,
} from './model/types'
export { statsKeys } from './model/queryKeys'
export { statsSummaryQueryOptions, equityCurveQueryOptions } from './model/queryOptions'
export {
  getStatsSummary,
  getEquityCurve,
  getStatsCycles,
  getHousingBenchmarkComparison,
  getHousingBenchmarkSeries,
  getHousingPriceIndexSeries,
  getEtfPriceSeries,
  getHousingBenchmarkRegions,
} from './api'
export {
  useStatsSummaryQuery,
  useEquityCurveQuery,
  useHousingBenchmarkQuery,
  useHousingBenchmarkSeriesQuery,
  useHousingPriceIndexSeriesQuery,
  useEtfPriceSeriesQuery,
  useHousingBenchmarkRegionsQuery,
  useStatsCyclesQuery,
} from './hooks/useStatsQueries'
