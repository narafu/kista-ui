import { queryOptions } from '@tanstack/react-query'
import { getEquityCurve, getStatsSummary } from '../api'
import { statsKeys } from './queryKeys'
import type { EquityCurve, StatsSummary } from './types'

export function statsSummaryQueryOptions(token?: string) {
  return queryOptions<StatsSummary>({
    queryKey: statsKeys.summary(),
    queryFn: () => getStatsSummary(token),
    staleTime: 60_000,
  })
}

export function equityCurveQueryOptions(
  params: { from?: string; to?: string; type?: string },
  token?: string,
) {
  return queryOptions<EquityCurve>({
    queryKey: statsKeys.equityCurve(params.from, params.to, params.type ?? 'ALL'),
    queryFn: () => getEquityCurve(params, token),
    staleTime: 60_000,
  })
}
