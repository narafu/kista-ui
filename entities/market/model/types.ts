import type { MarketSessionStatus } from '@shared/lib/api-schema'

export interface MarketSession {
  session: MarketSessionStatus
  isDst: boolean
}
