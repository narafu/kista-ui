import { apiFetch, clientFetch } from './client'

// Server Component 전용 — kista-api 직접 호출
export function getMonthlyHolidays(year: number, month: number, token: string): Promise<string[]> {
  return apiFetch<string[]>(`/api/market/holidays?year=${year}&month=${month}`, { method: 'GET' }, token)
}

// Client Component 전용 — Route Handler 경유
export function getMonthlyHolidaysClient(year: number, month: number): Promise<string[]> {
  return clientFetch<string[]>(`/api/market/holidays?year=${year}&month=${month}`)
}

export interface MarketSession {
  session: 'DIRECT' | 'BLOCKED'
  isDst: boolean
}

// 현재 시장 세션 조회 (DIRECT=주문가능, BLOCKED=주문불가)
export function getMarketSession(): Promise<MarketSession> {
  return clientFetch<MarketSession>('/api/market/session')
}
