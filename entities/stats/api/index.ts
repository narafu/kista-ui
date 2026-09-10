import { fetchEither } from '@shared/lib/api-client'
import { buildQueryString } from '@shared/lib/query-string'
import type {
  CyclePerformancePage,
  EquityCurve,
  EtfPriceSeries,
  HousingBenchmarkComparison,
  HousingBenchmarkParams,
  HousingBenchmarkRegionsList,
  HousingBenchmarkSeries,
  HousingPriceIndexSeries,
  StatsSummary,
} from '../model/types'

export async function getStatsSummary(token?: string): Promise<StatsSummary> {
  return fetchEither<StatsSummary>('/api/stats/summary', { method: 'GET' }, token)
}

export async function getEquityCurve(
  params: { from?: string; to?: string; type?: string },
  token?: string
): Promise<EquityCurve> {
  const qs = buildQueryString(params)
  return fetchEither<EquityCurve>(`/api/stats/equity-curve${qs}`, { method: 'GET' }, token)
}

export async function getStatsCycles(
  params: { type?: string; cursor?: string; size?: number },
  token?: string
): Promise<CyclePerformancePage> {
  const qs = buildQueryString(params)
  return fetchEither<CyclePerformancePage>(`/api/stats/cycles${qs}`, { method: 'GET' }, token)
}

export async function getHousingBenchmarkComparison(
  params: HousingBenchmarkParams,
  token?: string
): Promise<HousingBenchmarkComparison> {
  const qs = buildQueryString({
    scope: params.scope,
    benchmarkType: params.benchmarkType,
    strategyId: params.strategyId,
    regionCode: params.benchmarkType === 'HOUSING' ? params.regionCode : undefined,
    symbol: params.benchmarkType === 'HOUSING' ? undefined : params.symbol,
    from: params.from,
    to: params.to,
  })
  return fetchEither<HousingBenchmarkComparison>(
    `/api/stats/housing-benchmark${qs}`,
    { method: 'GET' },
    token
  )
}

export async function getHousingBenchmarkSeries(
  params: { from?: string; to?: string; regionCode?: string },
  token?: string
): Promise<HousingBenchmarkSeries> {
  const qs = buildQueryString(params)
  return fetchEither<HousingBenchmarkSeries>(
    `/api/stats/housing-benchmark/series${qs}`,
    { method: 'GET' },
    token
  )
}

export async function getHousingPriceIndexSeries(
  params: { from?: string; to?: string; regionCode?: string },
  token?: string
): Promise<HousingPriceIndexSeries> {
  const qs = buildQueryString(params)
  return fetchEither<HousingPriceIndexSeries>(
    `/api/stats/housing-benchmark/index-series${qs}`,
    { method: 'GET' },
    token
  )
}

export async function getEtfPriceSeries(
  params: { from?: string; to?: string; symbol: string },
  token?: string
): Promise<EtfPriceSeries> {
  const qs = buildQueryString(params)
  return fetchEither<EtfPriceSeries>(
    `/api/stats/housing-benchmark/etf-series${qs}`,
    { method: 'GET' },
    token
  )
}

// KB Land가 실제 제공하는 지역 목록 — 하드코딩 금지, DB 동적 조회
export async function getHousingBenchmarkRegions(token?: string): Promise<HousingBenchmarkRegionsList> {
  return fetchEither<HousingBenchmarkRegionsList>(
    '/api/stats/housing-benchmark/regions',
    { method: 'GET' },
    token
  )
}
