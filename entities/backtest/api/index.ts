import { fetchEither } from '@shared/lib/api-client'
import type { BacktestParams, BacktestResult } from '../model/types'

export async function getBacktest(params: BacktestParams, token?: string): Promise<BacktestResult> {
  const q = new URLSearchParams()
  // 미지정(undefined/null) 파라미터는 생략 — 서버 기본값을 쓴다
  for (const [key, value] of Object.entries(params)) {
    if (value != null) q.set(key, String(value))
  }
  return fetchEither<BacktestResult>(`/api/backtest?${q}`, { method: 'GET' }, token)
}
