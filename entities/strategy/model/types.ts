// type/status/ticker는 string — 백엔드 메타 API가 SSOT (리터럴 직접 사용 금지)
// CycleSeedType은 요청 DTO에서 enum으로 선언 → api-schema에서 파생
export type { CycleSeedType } from '@shared/lib/api-schema'
import type { CycleSeedType } from '@shared/lib/api-schema'

export interface Strategy {
  id: string
  accountId: string
  type: string        // 메타의 StrategyTypeMeta.code
  status: string      // 'ACTIVE' | 'PAUSED'
  ticker: string      // 메타의 TickerMeta.code
  cycleSeedType: CycleSeedType
  initialUsdDeposit?: number
  divisionCount: number   // 분할 수 (20/30/40)
}

export interface StrategyRequest {
  type: string
  ticker?: string
  cycleSeedType: CycleSeedType
  initialUsdDeposit?: number  // 등록 시 또는 시드 수정 시 전송
  divisionCount?: number      // 분할 수 (20/30/40, 미전송 시 백엔드 기본값 20)
}
