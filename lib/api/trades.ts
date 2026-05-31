import { apiFetch, clientFetch } from './client'
import type { TradeHistory, Execution, CycleHistoryItem, DailyTransactionResult, PortfolioSnapshot, ProfitSummary, MarginItem, ReservationOrder } from '@/types/trade'

function buildDateQuery(params: { from?: string; to?: string }): string {
  const q = new URLSearchParams()
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
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
  params: { from?: string; to?: string },
  token?: string
): Promise<CycleHistoryItem[]> {
  const q = new URLSearchParams()
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  const qs = q.size ? `?${q}` : ''
  if (token) return apiFetch<CycleHistoryItem[]>(`/api/accounts/${accountId}/cycle-history${qs}`, { method: 'GET' }, token)
  return clientFetch<CycleHistoryItem[]>(`/api/accounts/${accountId}/cycle-history${qs}`)
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

export async function getAccountReservationOrders(
  accountId: string,
  params: { from: string; to: string },
  token?: string
): Promise<ReservationOrder[]> {
  const q = new URLSearchParams({ from: params.from, to: params.to })
  if (token) return apiFetch<ReservationOrder[]>(`/api/accounts/${accountId}/reservation-orders?${q}`, { method: 'GET' }, token)
  return clientFetch<ReservationOrder[]>(`/api/accounts/${accountId}/reservation-orders?${q}`)
}
