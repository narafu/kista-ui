export interface AdminPrivacyOrder {
  id: string
  direction: 'BUY' | 'SELL'
  orderType: 'LOC' | 'MOC' | 'LIMIT'
  price: number
  quantity: number | null
}

export interface AdminPrivacyBase {
  id: string
  releaseDate: string
  ticker: string
  currentCycleStart: number
  currentCycleRealizedPnl: number
  avgPrice: number | null
  holdings: number
  orders: AdminPrivacyOrder[]
}
