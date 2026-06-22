import { apiFetch, fetchEither } from '@shared/lib/api-client'
import type {
  Execution,
  CycleHistoryPage,
  DailyTransactionResult,
  PortfolioSnapshot,
  PortfolioSummary,
  MarginItem,
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

export async function getPortfolioSnapshots(
  params: { from?: string; to?: string },
  token?: string
): Promise<PortfolioSnapshot[]> {
  return fetchEither<PortfolioSnapshot[]>(`/api/portfolio/snapshots${buildDateQuery(params)}`, { method: 'GET' }, token)
}

export async function getAccountSnapshots(
  accountId: string,
  params: { from?: string; to?: string },
  token?: string
): Promise<PortfolioSnapshot[]> {
  return fetchEither<PortfolioSnapshot[]>(`/api/accounts/${accountId}/snapshots${buildDateQuery(params)}`, { method: 'GET' }, token)
}

export async function getAccountTrades(
  accountId: string,
  params: { from: string; to: string },
  token: string
): Promise<Execution[]> {
  const q = new URLSearchParams({ from: params.from, to: params.to })
  return apiFetch<Execution[]>(`/api/accounts/${accountId}/trades?${q}`, { method: 'GET' }, token)
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

export async function getAccountMargin(accountId: string, token?: string): Promise<MarginItem[]> {
  return fetchEither<MarginItem[]>(`/api/accounts/${accountId}/margin`, { method: 'GET' }, token)
}

export async function getDailyTransactions(
  accountId: string,
  params: { from: string; to: string },
  token?: string
): Promise<DailyTransactionResult> {
  const q = new URLSearchParams({ from: params.from, to: params.to })
  return fetchEither<DailyTransactionResult>(`/api/accounts/${accountId}/daily-trades?${q}`, { method: 'GET' }, token)
}
