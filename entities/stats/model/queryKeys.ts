import type { HousingBenchmarkParams } from './types'

export const statsKeys = {
  all: ['stats'] as const,
  summary: () => [...statsKeys.all, 'summary'] as const,
  equityCurve: (from?: string, to?: string, type = 'ALL') =>
    [...statsKeys.all, 'equity-curve', from ?? null, to ?? null, type] as const,
  cycles: (type = 'ALL') => [...statsKeys.all, 'cycles', type] as const,
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
