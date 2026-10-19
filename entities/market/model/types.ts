export interface Candle {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface FearGreedPoint {
  date: string   // 수집 시각 ISO-8601 Instant (예: 2026-10-12T03:00:01.038742Z)
  value: number  // 0~100
  rating: string // EXTREME_FEAR | FEAR | NEUTRAL | GREED | EXTREME_GREED
}

export interface FearGreedSourceView {
  current: FearGreedPoint | null
  history: FearGreedPoint[]
}

export interface FearGreed {
  cnn: FearGreedSourceView
  crypto: FearGreedSourceView
}

// GET /api/crypto-market-indicators — 생성 타입(api-types)은 모든 필드가 optional이고 $ref 섹션의 nullable이
// 빠져 있어 kista-api CryptoMarketIndicatorsResponse 기준으로 직접 정의한다. 김프·프리미엄은 %, 펀딩비는 비율 원값
export interface DatedValue {
  date: string // UTC 일자 YYYY-MM-DD
  value: number
}

export interface KimchiPremiumPoint {
  date: string
  official: number | null // 환율이 없는 날·환율 조회 실패 시 null
  tether: number
}

export interface CryptoTickerIndicators {
  ticker: string
  kimchiPremium: { current: { official: number | null; tether: number }; history: KimchiPremiumPoint[] } | null
  fundingRate: { current: number; nextFundingTime: string; history: DatedValue[] } | null
  openInterest: { history: { date: string; valueUsd: number }[] } | null // 최근 30일 고정
}

export interface CryptoMarketIndicators {
  asOf: string
  usdtPremium: { current: number; history: DatedValue[] } | null
  tickers: CryptoTickerIndicators[]
}
