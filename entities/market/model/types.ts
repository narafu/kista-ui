import type { components } from '@shared/lib/api-types'

export interface Candle {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  // 서버 계산 지표(RAW 종가 기준, 부족 시 null) — 차트 표시용
  sma20?: number | null
  sma50?: number | null
  sma120?: number | null
  sma200?: number | null
  rsi14?: number | null
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
  crypto: FearGreedSourceView // alternative.me 장애 시 { current: null, history: [] }
}

// GET /api/market/session — 서버 거래일(KST)과 그 거래일에 US 장이 열리는지. 구버전 서버는 두 필드가 없거나 tradeDateKst=null로 내려온다
export type MarketSession = components['schemas']['MarketSessionResponse']
