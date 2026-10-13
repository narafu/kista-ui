import type { HousingBenchmarkParams, StatsCyclesFilters } from './types'

export const statsKeys = {
  all: ['stats'] as const,
  summary: () => [...statsKeys.all, 'summary'] as const,
  // 기간·필터 무관 전체 무효화용 prefix — factory 기본 인자가 박힌 키로는 prefix 매칭이 안 된다
  equityCurveAll: () => [...statsKeys.all, 'equity-curve'] as const,
  equityCurve: (from?: string, to?: string, type = 'ALL') =>
    [...statsKeys.equityCurveAll(), from ?? null, to ?? null, type] as const,
  cyclesAll: () => [...statsKeys.all, 'cycles'] as const,
  cycles: ({ type, accountId, ticker, status, page = 0, size }: StatsCyclesFilters = {}) =>
    [...statsKeys.cyclesAll(), type ?? 'ALL', accountId ?? null, ticker ?? null, status ?? 'ALL', page, size ?? null] as const,
  housingComparison: (params: HousingBenchmarkParams) => [
    ...statsKeys.all,
    'housing-comparison',
    params.scope,
    params.strategyId ?? null,
    params.benchmarkType,
    params.benchmarkType === 'HOUSING' ? params.regionCode : null,
    params.benchmarkType === 'ETF' ? params.symbol : null,
    params.from ?? null,
    params.to ?? null,
  ] as const,
  housingSeries: (from?: string, to?: string, regionCode?: string) =>
    [...statsKeys.all, 'housing-series', from ?? null, to ?? null, regionCode ?? null] as const,
  housingPriceIndexSeries: (from?: string, to?: string, regionCode?: string) =>
    [...statsKeys.all, 'housing-price-index-series', from ?? null, to ?? null, regionCode ?? null] as const,
  etfPriceSeries: (from?: string, to?: string, symbol?: string) =>
    [...statsKeys.all, 'etf-price-series', from ?? null, to ?? null, symbol ?? null] as const,
  housingRegions: () => [...statsKeys.all, 'housing-regions'] as const,
}
