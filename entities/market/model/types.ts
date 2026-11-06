import type { components } from '@shared/lib/api-types'

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

// GET /api/market/session — 서버 거래일(KST)과 그 거래일에 US 장이 열리는지. 구버전 서버는 두 필드가 없거나 tradeDateKst=null로 내려온다.
// gen:types에 반영되기 전까지 직접 선언한다(생성 타입에 필드가 생기면 이 선언을 components 참조로 바꾼다)
export interface MarketSession {
  tradeDateKst?: string | null
  tradingDay?: boolean
}

// GET /api/crypto-market-indicators — kista-trading 응답. 실패한 섹션은 null, 김프·프리미엄은 %, 펀딩비는 비율 원값
type CryptoSchemas = components['schemas']

export type CryptoMarketIndicators = CryptoSchemas['CryptoMarketIndicatorsResponse']
export type CryptoTickerIndicators = CryptoSchemas['CryptoMarketIndicatorsTicker']
