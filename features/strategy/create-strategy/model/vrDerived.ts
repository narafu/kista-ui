import type { Strategy } from '@entities/strategy'

export type VrRecurringMode = 'DEPOSIT' | 'HOLD' | 'WITHDRAW'

export interface VrDerivedInput {
  initial?: Strategy
  avgPrice: number | null
  quantity: number | null
  initialValue: number | null
  seedUsd: number | null
  recurringMode: VrRecurringMode
  recurringAmount: number | null
  intervalWeeks: number | null
  initialGradient: number | null
  gMax: number | null
  initialPoolLimitRate: number | null
  poolLimitFloor: number | null
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

export interface VrDerived {
  evaluatedStockValueEstimate: number
  normalizedInitialValue: number
  normalizedRecurringAmount: number
  recurringMagnitude: number
  effectiveInitialGradient: number
  effectiveGMax: number
  effectiveInitialPoolLimitRate: number
  effectivePoolLimitFloor: number
  initialAssets: number
  evaluatedAssets: number
  requiredWithdrawalAssets: number
}

// VR 파생 계산 — useStrategyForm 318-340 라인의 순수 추출. 부수효과 없음.
export function computeVrDerived(input: VrDerivedInput): VrDerived {
  const {
    initial, avgPrice, quantity, initialValue, seedUsd, recurringMode, recurringAmount, intervalWeeks,
    initialGradient, gMax, initialPoolLimitRate, poolLimitFloor,
  } = input

  // VR 인출식 사전검증용 추정 평가금 — 서버는 등록 시점 전일종가×보유수량으로 V를 재계산하므로 이 값은 근사치다
  // (평단가 기준 추정. 실제 등록가는 시장가 기준이라 서버 계산과 다를 수 있음 — 최종 검증은 서버가 수행)
  const evaluatedStockValueEstimate = (avgPrice ?? 0) * (quantity ?? 0)
  // VR 거치식/적립식 게이트("V값+예수금>0") 판정용 V값 — 초기 V 입력(>0)이 있으면 우선 사용, 없으면 위 평가금 추정치
  // 인출식 최소자산 검증은 override를 절대 반영하지 않는다(서버 validateVrCommand와 동일 원칙 — evaluatedStockValueEstimate만 사용,
  // 아래 requiredWithdrawalAssets 비교 참고). override로 인출 안전장치를 우회할 수 없게 하기 위함
  const normalizedInitialValue = initial
    ? initial.vr?.value ?? 0
    : (initialValue !== null && initialValue > 0 ? initialValue : evaluatedStockValueEstimate)
  const normalizedInitialSeed = seedUsd ?? 0
  const recurringMagnitude = Math.abs(recurringAmount ?? 0)
  const normalizedRecurringAmount = recurringMode === 'HOLD'
    ? 0
    : recurringMode === 'WITHDRAW'
      ? -recurringMagnitude
      : recurringMagnitude
  // 램프 4필드 기본값 — 금액이 아닌 recurringMode 선택 자체로만 결정(적립 금액 0원 입력 중에도 적립식 기본값 유지)
  const rampDefaults = RAMP_DEFAULTS_BY_MODE[recurringMode]
  const effectiveInitialGradient = initialGradient ?? rampDefaults.initialGradient
  const effectiveGMax = gMax ?? rampDefaults.gMax
  const effectiveInitialPoolLimitRate = initialPoolLimitRate ?? rampDefaults.initialPoolLimitRate
  const effectivePoolLimitFloor = poolLimitFloor ?? rampDefaults.poolLimitFloor
  const initialAssets = normalizedInitialValue + normalizedInitialSeed
  const evaluatedAssets = (initial ? initial.vr?.value ?? 0 : evaluatedStockValueEstimate) + normalizedInitialSeed
  const requiredWithdrawalAssets = intervalWeeks !== null && intervalWeeks > 0
    ? Math.abs(normalizedRecurringAmount) * 100 * (4 / intervalWeeks)
    : 0

  return {
    evaluatedStockValueEstimate,
    normalizedInitialValue,
    normalizedRecurringAmount,
    recurringMagnitude,
    effectiveInitialGradient,
    effectiveGMax,
    effectiveInitialPoolLimitRate,
    effectivePoolLimitFloor,
    initialAssets,
    evaluatedAssets,
    requiredWithdrawalAssets,
  }
}
