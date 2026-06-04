// enum 값은 모두 string — 백엔드 메타 API가 SSOT
export type CycleSeedType = 'NONE' | 'MAX' | 'MAINTAIN'

export interface Strategy {
  id: string
  accountId: string
  type: string        // 메타의 StrategyTypeMeta.code
  status: string      // 'ACTIVE' | 'PAUSED'
  ticker: string      // 메타의 TickerMeta.code
  cycleSeedType: CycleSeedType
  initialUsdDeposit?: number
}

export interface StrategyRequest {
  type: string
  ticker?: string
  cycleSeedType: CycleSeedType
  initialUsdDeposit?: number  // 신규 등록 시에만 전송
}
