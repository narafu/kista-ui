import { apiFetch, clientFetch } from '@shared/lib/api-client'
import type { Candle, FearGreed, MarketSession } from '../model/types'
import { CHART_CANDLE_COUNT } from '../model/constants'

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL

export function getMonthlyHolidays(year: number, month: number, token: string): Promise<string[]> {
  return apiFetch<string[]>(`/api/market/holidays?year=${year}&month=${month}`, { method: 'GET' }, token)
}

// 비인증 Server Component용 — kista-api 직접 호출
export function getMonthlyHolidaysPublic(year: number, month: number): Promise<string[]> {
  return fetch(`${API_BASE_URL}/api/market/holidays?year=${year}&month=${month}`)
    .then(res => res.ok ? res.json() as Promise<string[]> : [])
    .catch(() => [])
}

export function getMonthlyHolidaysClient(year: number, month: number): Promise<string[]> {
  return clientFetch<string[]>(`/api/market/holidays?year=${year}&month=${month}`)
}

export function getMarketSession(): Promise<MarketSession> {
  return clientFetch<MarketSession>('/api/market/session')
}

export function getCandlesClient(ticker: string, count = CHART_CANDLE_COUNT): Promise<Candle[]> {
  return clientFetch<Candle[]>(`/api/market/candles?ticker=${ticker}&count=${count}`)
}

export function getFearGreedClient(days = CHART_CANDLE_COUNT): Promise<FearGreed> {
  return clientFetch<FearGreed>(`/api/market/fear-greed?days=${days}`)
}
