// enum 값은 모두 string — 백엔드 메타 API가 SSOT
export interface Strategy {
  id: string
  accountId: string
  type: string      // 메타의 StrategyTypeMeta.code
  status: string    // 'ACTIVE' | 'PAUSED'
  ticker: string    // 메타의 TickerMeta.code
  multiple: string  // BigDecimal → string
}

export interface StrategyRequest {
  type: string
  ticker?: string
  multiple?: string
}
