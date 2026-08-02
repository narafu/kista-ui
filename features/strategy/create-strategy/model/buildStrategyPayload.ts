import type { CycleSeedType, Strategy, StrategyRequest } from '@entities/strategy'
import type { RuntimeConfig, RuntimeFieldSettings, RuntimeStrategyType } from '@entities/runtime-config'
import type { DivisionCount } from './strategyFormSchema'
import type { VrDerived } from './vrDerived'
import type { VrFields } from './useStrategyForm'

type RuntimeStrategySettings = RuntimeConfig['strategies'][RuntimeStrategyType]

export interface BuildStrategyPayloadInput {
  initial?: Strategy
  type: string
  ticker: string
  cycleSeedType: CycleSeedType
  seedUsd: number | null
  canEditSeed: boolean
  isVr: boolean
  usesDivisionCount: boolean
  divisionCount: DivisionCount
  divisionCountSettings?: RuntimeFieldSettings<number>
  runtimeStrategy?: RuntimeStrategySettings
  vrFields: VrFields
  vrDerived: VrDerived
  scheduledStartDate: string | null
}

// StrategyRequest 조립 — useStrategyForm 509-556 라인의 순수 추출. 부수효과 없음.
export function buildStrategyPayload(input: BuildStrategyPayloadInput): StrategyRequest {
  const {
    initial, type, ticker, cycleSeedType, seedUsd, canEditSeed, isVr, usesDivisionCount,
    divisionCount, divisionCountSettings, runtimeStrategy, vrFields, vrDerived, scheduledStartDate,
  } = input
  const {
    avgPrice, quantity, intervalWeeks, bandWidth, initialValue, initialGradient,
    gGraceWeeks, gStepWeeks, gMax, initialPoolLimitRate, pGraceWeeks, pStepWeeks, poolLimitFloor,
  } = vrFields
  const { normalizedRecurringAmount } = vrDerived
  const normalizedInitialSeed = seedUsd ?? 0

  return initial
    ? {
        type: initial.type,
        ticker: initial.ticker,
        cycleSeedType,
        ...(canEditSeed ? { initialUsdDeposit: seedUsd ?? undefined } : {}),
      }
    : {
        type,
        ticker: runtimeStrategy?.fields.ticker.customizable === false
          ? runtimeStrategy.fields.ticker.defaultValue
          : ticker,
        cycleSeedType,
        initialUsdDeposit: isVr ? normalizedInitialSeed : seedUsd ?? undefined,
        ...(usesDivisionCount ? {
          divisionCount: divisionCountSettings?.customizable === false
            ? divisionCountSettings.defaultValue
            : divisionCount,
        } : {}),
        // 중간부터 시작 — 세 전략 공통, 보유 수량>0일 때만 전송 (미입력/0이면 빈 포지션에서 시작)
        ...(quantity !== null && quantity > 0 ? {
          initialHoldings: quantity,
          initialAvgPrice: avgPrice ?? undefined,
        } : {}),
        // 시작예정일 — 세 전략 공통, 등록 전용, 미입력 시 생략(서버가 오늘로 처리)
        ...(scheduledStartDate ? { scheduledStartDate } : {}),
        // VR 전용 필드 — null이면 0으로 기본값 처리
        ...(isVr ? {
          intervalWeeks: runtimeStrategy?.fields.intervalWeeks?.customizable === false
            ? runtimeStrategy.fields.intervalWeeks.defaultValue
            : intervalWeeks ?? undefined,
          bandWidth: runtimeStrategy?.fields.bandWidth?.customizable === false
            ? runtimeStrategy.fields.bandWidth.defaultValue
            : bandWidth ?? undefined,
          recurringAmount: normalizedRecurringAmount,
          // 초기 V 직접 입력 — 있으면 전송, 없으면 생략(서버가 평가금 기준으로 계산)
          ...(initialValue !== null && initialValue > 0 ? { initialVrValue: initialValue } : {}),
          // 램프 파라미터 — 값이 있을 때만 포함(생략 시 서버 기본값 적용)
          ...(initialGradient !== null ? { initialGradient } : {}),
          ...(gGraceWeeks !== null ? { gGraceWeeks } : {}),
          ...(gStepWeeks !== null ? { gStepWeeks } : {}),
          ...(gMax !== null ? { gMax } : {}),
          ...(initialPoolLimitRate !== null ? { initialPoolLimitRate } : {}),
          ...(pGraceWeeks !== null ? { pGraceWeeks } : {}),
          ...(pStepWeeks !== null ? { pStepWeeks } : {}),
          ...(poolLimitFloor !== null ? { poolLimitFloor } : {}),
        } : {}),
      }
}
