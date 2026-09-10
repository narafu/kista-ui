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

export interface AdminPrivacyOrderRequest {
  direction: AdminPrivacyOrder['direction']
  orderType: AdminPrivacyOrder['orderType']
  price: number
  quantity: number | null
}

// POST /api/admin/privacy-trade-bases — 기존 FIDA 수신 로직 재사용. 동일 (releaseDate, ticker)에
// 내용까지 같으면 200(멱등), 다르면 409, 신규면 201.
export interface AdminPrivacyBaseCreateRequest {
  releaseDate: string
  ticker: string
  currentCycleStart: number
  currentCycleRealizedPnl: number
  avgPrice: number | null
  holdings: number
  orders: AdminPrivacyOrderRequest[]
}

// PATCH /api/admin/privacy-trade-bases/{id} — 4개 필드 전체 교체(부분 아님).
export interface AdminPrivacyBaseUpdateRequest {
  currentCycleStart: number
  currentCycleRealizedPnl: number
  avgPrice: number | null
  holdings: number
}

// PATCH /api/admin/privacy-trade-bases/{baseId}/orders/{orderId} — BUY는 quantity null 불가.
export interface AdminPrivacyOrderUpdateRequest {
  price: number
  quantity: number | null
}
