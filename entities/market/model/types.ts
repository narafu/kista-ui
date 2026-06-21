import type { MarketSessionStatus } from '@shared/lib/api-schema'

export interface MarketSession {
  session: MarketSessionStatus
  isDst: boolean
}

export interface Candle {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}
