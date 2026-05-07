import { apiFetch } from './client'
import type { TradeHistory, PortfolioSnapshot, ProfitSummary } from '@/types/trade'

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
  token: string
): Promise<PortfolioSnapshot[]> {
  return apiFetch<PortfolioSnapshot[]>(`/api/portfolio/snapshots${buildDateQuery(params)}`, { method: 'GET' }, token)
}

export async function getAccountProfit(
  accountId: string,
  params: { startDate?: string; endDate?: string },
  token: string
): Promise<ProfitSummary> {
  return apiFetch<ProfitSummary>(`/api/accounts/${accountId}/profit${buildDateQuery(params)}`, { method: 'GET' }, token)
}

export async function getAccountTrades(accountId: string, token: string): Promise<TradeHistory[]> {
  return apiFetch<TradeHistory[]>(`/api/accounts/${accountId}/trades`, { method: 'GET' }, token)
}

export async function getAccountPortfolio(accountId: string, token: string): Promise<PortfolioSnapshot> {
  return apiFetch<PortfolioSnapshot>(`/api/accounts/${accountId}/portfolio`, { method: 'GET' }, token)
}
