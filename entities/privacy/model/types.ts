export interface PrivacyCurrentBase {
  ticker: string
  currentCycleStart: number
  tradeDate: string
}

export type PrivacyRange = 'ALL' | '30' | '90'

export interface AdminPrivacyOrder {
  id: string
  direction: 'BUY' | 'SELL'
  orderType: 'LOC' | 'MOC' | 'LIMIT'
  price: number
  quantity: number | null
}

export interface AdminPrivacyBase {
  id: string
  tradeDate: string
  ticker: string
  currentCycleStart: number
  currentCycleRealizedPnl: number
  avgPrice: number | null
  holdings: number
  orders: AdminPrivacyOrder[]
}
