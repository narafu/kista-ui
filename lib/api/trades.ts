import { apiFetch } from './client'
import type { TradeHistory, PortfolioSnapshot, ProfitSummary } from '@/types/trade'

export async function getTrades(
  params: { startDate?: string; endDate?: string },
  token: string
): Promise<TradeHistory[]> {
  const query = new URLSearchParams()
  if (params.startDate) query.set('startDate', params.startDate)
  if (params.endDate) query.set('endDate', params.endDate)
  const qs = query.toString() ? `?${query.toString()}` : ''
  return apiFetch<TradeHistory[]>(`/api/trades${qs}`, { method: 'GET' }, token)
}

export async function getCurrentPortfolio(token: string): Promise<PortfolioSnapshot> {
  return apiFetch<PortfolioSnapshot>('/api/portfolio/current', { method: 'GET' }, token)
}

export async function getPortfolioSnapshots(
  params: { startDate?: string; endDate?: string },
  token: string
): Promise<PortfolioSnapshot[]> {
  const query = new URLSearchParams()
  if (params.startDate) query.set('startDate', params.startDate)
  if (params.endDate) query.set('endDate', params.endDate)
  const qs = query.toString() ? `?${query.toString()}` : ''
  return apiFetch<PortfolioSnapshot[]>(`/api/portfolio/snapshots${qs}`, { method: 'GET' }, token)
}

export async function getAccountProfit(
  accountId: string,
  params: { startDate?: string; endDate?: string },
  token: string
): Promise<ProfitSummary> {
  const query = new URLSearchParams()
  if (params.startDate) query.set('startDate', params.startDate)
  if (params.endDate) query.set('endDate', params.endDate)
  const qs = query.toString() ? `?${query.toString()}` : ''
  return apiFetch<ProfitSummary>(`/api/accounts/${accountId}/profit${qs}`, { method: 'GET' }, token)
}

export async function getAccountTrades(accountId: string, token: string): Promise<TradeHistory[]> {
  return apiFetch<TradeHistory[]>(`/api/accounts/${accountId}/trades`, { method: 'GET' }, token)
}

export async function getAccountPortfolio(accountId: string, token: string): Promise<PortfolioSnapshot> {
  return apiFetch<PortfolioSnapshot>(`/api/accounts/${accountId}/portfolio`, { method: 'GET' }, token)
}
