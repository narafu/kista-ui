import { ApiError, apiFetch, clientFetch } from '@shared/lib/api-client'
import { getApiBaseUrl } from '@shared/lib/env'
import type { Candle, FearGreed } from '../model/types'
import { CHART_CANDLE_COUNT } from '../model/constants'

export function getMonthlyHolidays(year: number, month: number, token: string): Promise<string[]> {
  return apiFetch<string[]>(`/api/market/holidays?year=${year}&month=${month}`, { method: 'GET' }, token)
}

// 비인증 Server Component용 — kista-api 직접 호출
export async function getMonthlyHolidaysPublic(year: number, month: number): Promise<string[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/market/holidays?year=${year}&month=${month}`)
  if (!response.ok) {
    let body: unknown = null
    try { body = await response.json() } catch {}
    throw new ApiError(response.status, body)
  }
  return response.json() as Promise<string[]>
}

export function getMonthlyHolidaysClient(year: number, month: number): Promise<string[]> {
  return clientFetch<string[]>(`/api/market/holidays?year=${year}&month=${month}`)
}

export function getCandlesClient(ticker: string, count = CHART_CANDLE_COUNT): Promise<Candle[]> {
  return clientFetch<Candle[]>(`/api/market/candles?ticker=${ticker}&count=${count}`)
}

export function getFearGreedClient(days = CHART_CANDLE_COUNT): Promise<FearGreed> {
  return clientFetch<FearGreed>(`/api/market/fear-greed?days=${days}`)
}
