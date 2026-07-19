import { fetchEither } from '@shared/lib/api-client'
import type {
  CyclePerformancePage,
  EquityCurve,
  HousingBenchmarkComparison,
  HousingBenchmarkParams,
  StatsSummary,
} from '../model/types'

export async function getStatsSummary(token?: string): Promise<StatsSummary> {
  return fetchEither<StatsSummary>('/api/stats/summary', { method: 'GET' }, token)
}

export async function getEquityCurve(
  params: { from?: string; to?: string },
  token?: string
): Promise<EquityCurve> {
  const q = new URLSearchParams()
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
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
  const q = new URLSearchParams({ scope: params.scope })
  if (params.strategyId) q.set('strategyId', params.strategyId)
  q.set('quintile', String(params.quintile))
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  return fetchEither<HousingBenchmarkComparison>(
    `/api/stats/housing-benchmark?${q}`,
    { method: 'GET' },
    token
  )
}
