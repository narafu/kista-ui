// type/status/ticker는 string — 백엔드 메타 API가 SSOT (리터럴 직접 사용 금지)
// CycleSeedType은 요청 DTO에서 enum으로 선언 → api-schema에서 파생
export type { CycleSeedType } from '@shared/lib/api-schema'
import type { CycleSeedType } from '@shared/lib/api-schema'

// VR(밸류리밸런싱) 전략 요약 — 사이클 시작 시 스냅샷 + 설정값
export interface StrategyVrSummary {
  value: number          // 기준 V값
  bandWidth: number      // 밴드 폭 (%)
  intervalWeeks: number  // 롤오버 주기 (주)
  recurringAmount: number // 정기 입출금 (USD, 양수=입금 / 0=거치 / 음수=인출)
  poolLimit: number      // pool 한도
  gradient: number       // 조정 계수 G
}

export interface Strategy {
  id: string
  accountId: string
  type: string        // 메타의 StrategyTypeMeta.code
  status: string      // 'ACTIVE' | 'PAUSED'
  ticker: string      // 메타의 TickerMeta.code
  cycleSeedType: CycleSeedType
  initialUsdDeposit?: number
  divisionCount?: number  // 분할 수 (INFINITE: 20/30/40, VR/PRIVACY: undefined)
  isReverseMode: boolean  // 리버스모드 활성 여부 (소진 후 모드)
  currentRound?: number   // 현재 회차 (INFINITE 전략만, 이력 없으면 0)
  currentHoldings?: number
  vr?: StrategyVrSummary  // VR 전략 전용 요약 (타 전략 undefined)
  startDate?: string      // 사이클 시작(예정)일 (yyyy-MM-dd) — 오늘 이후면 아직 매매 시작 전(시작예정)
}

export interface StrategyRequest {
  type: string
  ticker?: string
  cycleSeedType: CycleSeedType
  initialUsdDeposit?: number  // 등록 시 또는 holdings=0 수정 시 전송
  divisionCount?: number      // 분할 수 (20/30/40, 미전송 시 백엔드 기본값 20)
  initialHoldings?: number    // 중간부터 시작 — 등록 시점 기존 보유 수량 (세 전략 공통, 등록 전용, null/0이면 빈 포지션)
  initialAvgPrice?: number    // 중간부터 시작 — 등록 시점 기존 평단가 (initialHoldings>0이면 필수)
  intervalWeeks?: number      // VR 전용: 롤오버 주기 (주)
  bandWidth?: number          // VR 전용: 밴드 폭 (%)
  recurringAmount?: number    // VR 전용: 정기 입출금 (USD)
  scheduledStartDate?: string // 시작예정일 (yyyy-MM-dd) — 세 전략 공통, 등록 전용, 미전송 시 오늘 시작
}

export interface StrategySeedPreview {
  ticker: string
  basePrice: number | null
  minSeed: number | null
  skipReason: string | null
}
