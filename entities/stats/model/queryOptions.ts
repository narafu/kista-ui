import { queryOptions } from '@tanstack/react-query'
import { getEquityCurve, getStatsSummary } from '../api'
import { statsKeys } from './queryKeys'
import type { Currency } from '@shared/lib/api-schema'
import type { EquityCurve, EquityCurveParams, StatsSummary } from './types'

export function statsSummaryQueryOptions(currency: Currency = 'USD', token?: string) {
  return queryOptions<StatsSummary>({
    queryKey: statsKeys.summary(currency),
    queryFn: () => getStatsSummary(currency, token),
    staleTime: 60_000,
  })
}

export function equityCurveQueryOptions(
  params: EquityCurveParams,
  token?: string,
) {
  return queryOptions<EquityCurve>({
    queryKey: statsKeys.equityCurve(params.from, params.to, params.type ?? 'ALL', params.currency ?? 'USD'),
    queryFn: () => getEquityCurve(params, token),
    staleTime: 60_000,
  })
}
