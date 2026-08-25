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
  poolLimit: number      // pool 한도 (현재 사이클 스냅샷 — 램프 0주차 값은 initialPoolLimitRate)
  currentPool?: number   // 최신 포지션 기준 실시간 pool(예수금). 포지션 이력 없는 극초기 상태면 null
  poolLimitRate: number  // pool 한도 비율(0~1, 현재 사이클 스냅샷 — 램프 0주차 값은 initialPoolLimitRate)
  gradient: number       // 조정 계수 G (현재 사이클 스냅샷 — 램프 0주차 값은 initialGradient)
  initialGradient: number       // 램프 시작(경과 0주) G값
  gGraceWeeks: number            // G 램프 시작 전 유예 주수
  gStepWeeks: number             // G가 1단계 오르는 주기(주)
  gMax: number                    // G 상한
  initialPoolLimitRate: number  // 램프 시작(경과 0주) poolLimitRate(0~1 비율)
  pGraceWeeks: number             // poolLimitRate 램프 시작 전 유예 주수
  pStepWeeks: number              // poolLimitRate가 5%p 내려가는 주기(주)
  poolLimitFloor: number          // poolLimitRate 하한(0~1)
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
  initialVrValue?: number     // VR 전용: 초기 V값 직접 지정 (등록 전용, 없으면 평가금 기준으로 서버가 계산)
  initialGradient?: number       // VR 전용: 램프 시작(경과 0주) G값
  gGraceWeeks?: number            // VR 전용: G 램프 시작 전 유예 주수
  gStepWeeks?: number             // VR 전용: G가 1단계 오르는 주기(주)
  gMax?: number                    // VR 전용: G 상한
  initialPoolLimitRate?: number  // VR 전용: 램프 시작(경과 0주) poolLimitRate(0~1 비율)
  pGraceWeeks?: number             // VR 전용: poolLimitRate 램프 시작 전 유예 주수
  pStepWeeks?: number              // VR 전용: poolLimitRate가 5%p 내려가는 주기(주)
  poolLimitFloor?: number          // VR 전용: poolLimitRate 하한(0~1)
  scheduledStartDate?: string // 시작예정일 (yyyy-MM-dd) — 세 전략 공통, 등록 전용, 미전송 시 오늘 시작
}

export interface StrategySeedPreview {
  ticker: string
  basePrice: number | null
  minSeed: number | null
  skipReason: string | null
}

// VR 전략 운영 중 재설정 — PUT /api/trading-cycles/{id}/vr-config 요청 바디, 16필드 전부 optional
export interface ReconfigureVrRequest {
  bandWidth?: number
  intervalWeeks?: number
  recurringAmount?: number
  initialGradient?: number
  gGraceWeeks?: number
  gStepWeeks?: number
  gMax?: number
  initialPoolLimitRate?: number
  pGraceWeeks?: number
  pStepWeeks?: number
  poolLimitFloor?: number
  injectShares?: number
  injectSharePrice?: number
  injectDeposit?: number
  withdrawShares?: number
  withdrawDeposit?: number
}
