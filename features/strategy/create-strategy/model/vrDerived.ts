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
}

export interface VrDerived {
  evaluatedStockValueEstimate: number
  normalizedInitialValue: number
  normalizedRecurringAmount: number
  recurringMagnitude: number
  effectiveInitialGradient: number
  initialAssets: number
  evaluatedAssets: number
  requiredWithdrawalAssets: number
}

// VR 파생 계산 — useStrategyForm 318-340 라인의 순수 추출. 부수효과 없음.
export function computeVrDerived(input: VrDerivedInput): VrDerived {
  const { initial, avgPrice, quantity, initialValue, seedUsd, recurringMode, recurringAmount, intervalWeeks, initialGradient } = input

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
  const effectiveInitialGradient = initialGradient ?? (normalizedRecurringAmount < 0 ? 20 : 10)
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
    initialAssets,
    evaluatedAssets,
    requiredWithdrawalAssets,
  }
}
