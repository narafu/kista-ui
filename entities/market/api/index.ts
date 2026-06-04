import { apiFetch, clientFetch } from '@shared/lib/api-client'
import type { MarketSession } from '../model/types'

export function getMonthlyHolidays(year: number, month: number, token: string): Promise<string[]> {
  return apiFetch<string[]>(`/api/market/holidays?year=${year}&month=${month}`, { method: 'GET' }, token)
}

export function getMonthlyHolidaysClient(year: number, month: number): Promise<string[]> {
  return clientFetch<string[]>(`/api/market/holidays?year=${year}&month=${month}`)
}

export function getMarketSession(): Promise<MarketSession> {
  return clientFetch<MarketSession>('/api/market/session')
}
