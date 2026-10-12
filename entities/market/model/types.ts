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
