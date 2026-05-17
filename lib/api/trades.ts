import { apiFetch, ApiError } from './client'
import type { TradeHistory, Execution, PortfolioSnapshot, ProfitSummary, MarginItem, ReservationOrder, DailyTransactionResult } from '@/types/trade'

function buildDateQuery(params: { startDate?: string; endDate?: string }): string {
  const q = new URLSearchParams()
  if (params.startDate) q.set('startDate', params.startDate)
  if (params.endDate) q.set('endDate', params.endDate)
  return q.size ? `?${q}` : ''
}

export async function getTrades(
  params: { startDate?: string; endDate?: string },
  token: string
): Promise<TradeHistory[]> {
  return apiFetch<TradeHistory[]>(`/api/trades${buildDateQuery(params)}`, { method: 'GET' }, token)
}

export async function getCurrentPortfolio(token: string): Promise<PortfolioSnapshot> {
  return apiFetch<PortfolioSnapshot>('/api/portfolio/current', { method: 'GET' }, token)
}

export async function getPortfolioSnapshots(
  params: { startDate?: string; endDate?: string },
  token?: string
): Promise<PortfolioSnapshot[]> {
  if (token) return apiFetch<PortfolioSnapshot[]>(`/api/portfolio/snapshots${buildDateQuery(params)}`, { method: 'GET' }, token)
  const res = await fetch(`/api/portfolio/snapshots${buildDateQuery(params)}`)
  if (!res.ok) throw new ApiError(res.status, null)
  return res.json()
}

export async function getAccountProfit(
  accountId: string,
  params: { from: string; to: string },
  token?: string
): Promise<ProfitSummary> {
  const q = new URLSearchParams({ from: params.from, to: params.to })
  if (token) return apiFetch<ProfitSummary>(`/api/accounts/${accountId}/profit?${q}`, { method: 'GET' }, token)
  const res = await fetch(`/api/accounts/${accountId}/profit?${q}`)
  if (!res.ok) throw new ApiError(res.status, null)
  return res.json()
}

export async function getAccountTrades(
  accountId: string,
  params: { from: string; to: string },
  token: string
): Promise<Execution[]> {
  const q = new URLSearchParams({ from: params.from, to: params.to })
  return apiFetch<Execution[]>(`/api/accounts/${accountId}/trades?${q}`, { method: 'GET' }, token)
}

export async function getAccountPortfolio(accountId: string, token: string): Promise<PortfolioSnapshot> {
  return apiFetch<PortfolioSnapshot>(`/api/accounts/${accountId}/portfolio`, { method: 'GET' }, token)
}

export async function getAccountMargin(accountId: string, token?: string): Promise<MarginItem[]> {
  if (token) return apiFetch<MarginItem[]>(`/api/accounts/${accountId}/margin`, { method: 'GET' }, token)
  const res = await fetch(`/api/accounts/${accountId}/margin`)
  if (!res.ok) throw new ApiError(res.status, null)
  return res.json()
}

export async function getAccountReservationOrders(
  accountId: string,
  params: { from: string; to: string },
  token?: string
): Promise<ReservationOrder[]> {
  const q = new URLSearchParams({ from: params.from, to: params.to })
  if (token) return apiFetch<ReservationOrder[]>(`/api/accounts/${accountId}/reservation-orders?${q}`, { method: 'GET' }, token)
  const res = await fetch(`/api/accounts/${accountId}/reservation-orders?${q}`)
  if (!res.ok) throw new ApiError(res.status, null)
  return res.json()
}

export async function getAccountDailyTrades(
  accountId: string,
  params: { from: string; to: string },
  token: string
): Promise<DailyTransactionResult> {
  const q = new URLSearchParams({ from: params.from, to: params.to })
  return apiFetch<DailyTransactionResult>(`/api/accounts/${accountId}/daily-trades?${q}`, { method: 'GET' }, token)
}
