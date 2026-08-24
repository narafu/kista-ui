import { fetchEither } from '@shared/lib/api-client'
import type { BacktestParams, BacktestResult } from '../model/types'

export async function getBacktest(params: BacktestParams, token?: string): Promise<BacktestResult> {
  const q = new URLSearchParams({
    type: params.type,
    ticker: params.ticker,
    from: params.from,
    to: params.to,
    seed: String(params.seed),
  })
  if (params.divisionCount != null) q.set('divisionCount', String(params.divisionCount))
  if (params.vrBandWidth != null) q.set('vrBandWidth', String(params.vrBandWidth))
  if (params.vrIntervalWeeks != null) q.set('vrIntervalWeeks', String(params.vrIntervalWeeks))
  if (params.vrRecurringAmount != null) q.set('vrRecurringAmount', String(params.vrRecurringAmount))
  if (params.vrInitialValue != null) q.set('vrInitialValue', String(params.vrInitialValue))
  return fetchEither<BacktestResult>(`/api/backtest?${q}`, { method: 'GET' }, token)
}
