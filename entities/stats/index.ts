export type {
  StrategyTypeStats,
  StatsSummary,
  EquityPoint,
  EquityCurve,
  CyclePerformance,
  CycleStatusFilter,
  EtfBenchmarkSymbol,
  HousingBenchmarkParams,
  HousingBenchmark,
  HousingBenchmarkSummary,
  HousingBenchmarkPoint,
  HousingBenchmarkComparison,
  HousingBenchmarkSeries,
  HousingBenchmarkRegion,
  HousingBenchmarkRegionsList,
} from './model/types'
export { statsKeys } from './model/queryKeys'
export { statsSummaryQueryOptions, equityCurveQueryOptions } from './model/queryOptions'
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
export {
  housingBenchmarkChartNotice,
  formatHousingBenchmarkSeriesLabel,
  formatHousingBenchmarkMonth,
  formatHousingBenchmarkAxisMonth,
  formatHousingBenchmarkDate,
  formatHousingBenchmarkAxisDate,
  formatHousingBenchmarkAxisWeek,
  calculateQuintileCagr,
  calculateSeriesCagr,
  formatCagr,
  formatHousingIndexValue,
  formatHousingBenchmarkTooltipValue,
} from './lib/housingBenchmarkChartFormatters'
export type { HousingBenchmarkSeriesKey } from './lib/housingBenchmarkChartFormatters'
export { DEFAULT_HOUSING_REGION_CODE, DEFAULT_HOUSING_REGION_NAME } from './lib/housingRegionDefaults'
