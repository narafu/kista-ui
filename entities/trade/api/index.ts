import { apiFetch, fetchEither } from '@shared/lib/api-client'
import type {
  CycleHistoryPage,
  DailyTransactionResult,
  PortfolioSummary,
} from '../model/types'

function buildDateQuery(params: { from?: string; to?: string }): string {
  const q = new URLSearchParams()
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  return q.size ? `?${q}` : ''
}

function buildCycleHistoryQuery(params: {
  from?: string
  to?: string
  cursor?: string
  size?: number
}): string {
  const q = new URLSearchParams()
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  if (params.cursor) q.set('cursor', params.cursor)
  if (params.size != null) q.set('size', String(params.size))
  return q.size ? `?${q}` : ''
}

export async function getAccountCycleHistory(
  accountId: string,
  params: { from?: string; to?: string; cursor?: string; size?: number },
  token?: string
): Promise<CycleHistoryPage> {
  const qs = buildCycleHistoryQuery(params)
  return fetchEither<CycleHistoryPage>(`/api/accounts/${accountId}/cycle-history${qs}`, { method: 'GET' }, token)
}

export async function getStrategyCycleHistory(
  strategyId: string,
  params: { from?: string; to?: string; cursor?: string; size?: number },
  token?: string
): Promise<CycleHistoryPage> {
  const qs = buildCycleHistoryQuery(params)
  return fetchEither<CycleHistoryPage>(`/api/trading-cycles/${strategyId}/history${qs}`, { method: 'GET' }, token)
}

export async function getAccountPortfolio(accountId: string, token: string): Promise<PortfolioSummary> {
  return apiFetch<PortfolioSummary>(`/api/accounts/${accountId}/portfolio`, { method: 'GET' }, token)
}

// 유저 스코프 배치 조회 — 보유 계좌 전체를 계좌 구분 없이 합쳐 1회 요청으로 반환
export async function getDailyTransactionsBatch(
  params: { from: string; to: string },
  token?: string
): Promise<DailyTransactionResult> {
  const q = new URLSearchParams({ from: params.from, to: params.to })
  return fetchEither<DailyTransactionResult>(`/api/daily-trades?${q}`, { method: 'GET' }, token)
}
