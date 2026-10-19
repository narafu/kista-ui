import { ApiError, clientFetch } from '@shared/lib/api-client'
import { getApiBaseUrl } from '@shared/lib/env'
import type { Candle, CryptoMarketIndicators, FearGreed } from '../model/types'
import { CHART_CANDLE_COUNT } from '../model/constants'

// Server Component용 — 공개 엔드포인트라 로그인 여부와 무관하게 토큰 없이 kista-api 직접 호출
// (무효 토큰을 붙이면 permitAll 경로에서도 JwtAuthFilter가 401을 준다)
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

export function getFearGreedClient(days: number): Promise<FearGreed> {
  return clientFetch<FearGreed>(`/api/market/fear-greed?days=${days}`)
}

// kista-trading 소유(8081) — 서버가 10분 캐시하고 days(1~365)는 김프·Coinbase 프리미엄·펀딩비·밸류에이션 추이 길이만 정한다
export function getCryptoMarketIndicatorsClient(): Promise<CryptoMarketIndicators> {
  return clientFetch<CryptoMarketIndicators>('/api/crypto-market-indicators?days=365')
}
