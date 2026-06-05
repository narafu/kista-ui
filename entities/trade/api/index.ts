import { apiFetch, clientFetch } from '@shared/lib/api-client'
import type {
  TradeHistory,
  Execution,
  CycleHistoryItem,
  CycleHistoryPage,
  DailyTransactionResult,
  PortfolioSnapshot,
  ProfitSummary,
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

export async function getTrades(
  params: { from?: string; to?: string },
  token: string
): Promise<TradeHistory[]> {
  return apiFetch<TradeHistory[]>(`/api/trades${buildDateQuery(params)}`, { method: 'GET' }, token)
}

export async function getCurrentPortfolio(token: string): Promise<PortfolioSnapshot> {
  return apiFetch<PortfolioSnapshot>('/api/portfolio/current', { method: 'GET' }, token)
}

export async function getPortfolioSnapshots(
  params: { from?: string; to?: string },
  token?: string
): Promise<PortfolioSnapshot[]> {
  if (token) return apiFetch<PortfolioSnapshot[]>(`/api/portfolio/snapshots${buildDateQuery(params)}`, { method: 'GET' }, token)
  return clientFetch<PortfolioSnapshot[]>(`/api/portfolio/snapshots${buildDateQuery(params)}`)
}

export async function getAccountProfit(
  accountId: string,
  params: { from: string; to: string },
  token?: string
): Promise<ProfitSummary> {
  const q = new URLSearchParams({ from: params.from, to: params.to })
  if (token) return apiFetch<ProfitSummary>(`/api/accounts/${accountId}/profit?${q}`, { method: 'GET' }, token)
  return clientFetch<ProfitSummary>(`/api/accounts/${accountId}/profit?${q}`)
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
  if (token) return apiFetch<CycleHistoryPage>(`/api/accounts/${accountId}/cycle-history${qs}`, { method: 'GET' }, token)
  return clientFetch<CycleHistoryPage>(`/api/accounts/${accountId}/cycle-history${qs}`)
}

export async function getStrategyCycleHistory(
  strategyId: string,
  params: { from?: string; to?: string; cursor?: string; size?: number },
  token?: string
): Promise<CycleHistoryPage> {
  const qs = buildCycleHistoryQuery(params)
  if (token) return apiFetch<CycleHistoryPage>(`/api/trading-cycles/${strategyId}/history${qs}`, { method: 'GET' }, token)
  return clientFetch<CycleHistoryPage>(`/api/trading-cycles/${strategyId}/history${qs}`)
}

export async function getAccountPortfolio(accountId: string, token: string): Promise<PortfolioSnapshot> {
  return apiFetch<PortfolioSnapshot>(`/api/accounts/${accountId}/portfolio`, { method: 'GET' }, token)
}

export async function getAccountMargin(accountId: string, token?: string): Promise<MarginItem[]> {
  if (token) return apiFetch<MarginItem[]>(`/api/accounts/${accountId}/margin`, { method: 'GET' }, token)
  return clientFetch<MarginItem[]>(`/api/accounts/${accountId}/margin`)
}

export async function getDailyTransactions(
  accountId: string,
  params: { from: string; to: string },
  token?: string
): Promise<DailyTransactionResult> {
  const q = new URLSearchParams({ from: params.from, to: params.to })
  if (token) return apiFetch<DailyTransactionResult>(`/api/accounts/${accountId}/daily-trades?${q}`, { method: 'GET' }, token)
  return clientFetch<DailyTransactionResult>(`/api/accounts/${accountId}/daily-trades?${q}`)
}
