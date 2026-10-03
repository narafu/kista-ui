export type VrRecurringMode = 'DEPOSIT' | 'HOLD' | 'WITHDRAW'

// VR 램프 8필드 — 전략 등록 폼과 백테스트 폼이 공유. null은 "미입력(기본값 사용)"
export interface VrRampValues {
  initialGradient: number | null
  gGraceWeeks: number | null
  gStepWeeks: number | null
  gMax: number | null
  initialPoolLimitRate: number | null
  pGraceWeeks: number | null
  pStepWeeks: number | null
  poolLimitFloor: number | null
}

export const EMPTY_VR_RAMP: VrRampValues = {
  initialGradient: null,
  gGraceWeeks: null,
  gStepWeeks: null,
  gMax: null,
  initialPoolLimitRate: null,
  pGraceWeeks: null,
  pStepWeeks: null,
  poolLimitFloor: null,
}

// 램프 4필드 미입력("자동") 시 사용할 값 — 적립/거치/인출 선택 자체로만 결정(금액과 무관)
export const RAMP_DEFAULTS_BY_MODE: Record<VrRecurringMode, {
  initialGradient: number
  gMax: number
  initialPoolLimitRate: number
  poolLimitFloor: number
}> = {
  DEPOSIT: { initialGradient: 10, gMax: 20, initialPoolLimitRate: 1.0, poolLimitFloor: 0.5 },
  HOLD: { initialGradient: 10, gMax: 20, initialPoolLimitRate: 0.75, poolLimitFloor: 0.5 },
  WITHDRAW: { initialGradient: 40, gMax: 50, initialPoolLimitRate: 0.1, poolLimitFloor: 0.1 },
}
