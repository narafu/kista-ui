import { fetchEither } from '@shared/lib/api-client'
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
  const q = new URLSearchParams()
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  if (params.type) q.set('type', params.type)
  const qs = q.size ? `?${q}` : ''
  return fetchEither<EquityCurve>(`/api/stats/equity-curve${qs}`, { method: 'GET' }, token)
}

export async function getStatsCycles(
  params: { type?: string; cursor?: string; size?: number },
  token?: string
): Promise<CyclePerformancePage> {
  const q = new URLSearchParams()
  if (params.type) q.set('type', params.type)
  if (params.cursor) q.set('cursor', params.cursor)
  if (params.size != null) q.set('size', String(params.size))
  const qs = q.size ? `?${q}` : ''
  return fetchEither<CyclePerformancePage>(`/api/stats/cycles${qs}`, { method: 'GET' }, token)
}

export async function getHousingBenchmarkComparison(
  params: HousingBenchmarkParams,
  token?: string
): Promise<HousingBenchmarkComparison> {
  const q = new URLSearchParams({ scope: params.scope, benchmarkType: params.benchmarkType })
  if (params.strategyId) q.set('strategyId', params.strategyId)
  if (params.benchmarkType === 'HOUSING') {
    q.set('regionCode', params.regionCode)
  } else {
    q.set('symbol', params.symbol)
  }
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  return fetchEither<HousingBenchmarkComparison>(
    `/api/stats/housing-benchmark?${q}`,
    { method: 'GET' },
    token
  )
}

export async function getHousingBenchmarkSeries(
  params: { from?: string; to?: string; regionCode?: string },
  token?: string
): Promise<HousingBenchmarkSeries> {
  const q = new URLSearchParams()
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  if (params.regionCode) q.set('regionCode', params.regionCode)
  const qs = q.size ? `?${q}` : ''
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
  const q = new URLSearchParams()
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  if (params.regionCode) q.set('regionCode', params.regionCode)
  const qs = q.size ? `?${q}` : ''
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
  const q = new URLSearchParams({ symbol: params.symbol })
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  return fetchEither<EtfPriceSeries>(
    `/api/stats/housing-benchmark/etf-series?${q}`,
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
