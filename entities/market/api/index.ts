import { ApiError, apiFetch, clientFetch } from '@shared/lib/api-client'
import { getApiBaseUrl } from '@shared/lib/env'
import type { Candle, CryptoMarketIndicators, FearGreed } from '../model/types'
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

// 기간 조회(양 끝 포함) — kista-api가 내부에서 200봉씩 페이징한다. 기간은 최대 5년(초과 시 400)
export function getCandlesRangeClient(ticker: string, from: string, to: string): Promise<Candle[]> {
  return clientFetch<Candle[]>(`/api/market/candles?ticker=${ticker}&from=${from}&to=${to}`)
}

export function getFearGreedClient(days = CHART_CANDLE_COUNT): Promise<FearGreed> {
  return clientFetch<FearGreed>(`/api/market/fear-greed?days=${days}`)
}

// kista-trading 소유(8081) — 서버가 10분 캐시하고 days(1~200)는 김프·펀딩비 추이 길이만 정한다
export function getCryptoMarketIndicatorsClient(): Promise<CryptoMarketIndicators> {
  return clientFetch<CryptoMarketIndicators>('/api/crypto-market-indicators?days=200')
}
