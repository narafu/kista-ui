import { fmtUsd, todayKst } from '@shared/lib/format'
import { POOL_LIMIT_FLOOR_ZERO_MESSAGE } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import type { RuntimeConfig, RuntimeFieldSettings, RuntimeStrategyType } from '@entities/runtime-config'
import type { DivisionCount } from './strategyFormSchema'
import type { VrDerived, VrRecurringMode } from './vrDerived'
import type { VrFields } from './useStrategyForm'

type RuntimeStrategySettings = RuntimeConfig['strategies'][RuntimeStrategyType]

// 중간부터 시작 공통 검증 (세 전략 공통, 등록 전용) — 서버 validateBootstrapPosition과 동일 규칙(보유 수량>0이면 평단가>0 필수)에
// 반대 방향(평단가 입력했는데 수량 미입력)도 UI에서 선제 안내 — 서버는 quantity<=0이면 avgPrice를 payload에서 생략해 조용히 버리므로 사용자에게 알려야 함
export function isInvalidBootstrap(input: {
  initial?: Strategy
  avgPrice: number | null
  quantity: number | null
}): boolean {
  const { initial, avgPrice, quantity } = input
  return !initial && (
    (avgPrice !== null && avgPrice < 0) ||
    (quantity !== null && quantity < 0) ||
    (quantity !== null && !Number.isInteger(quantity)) ||
    (quantity !== null && quantity > 0 && (avgPrice === null || avgPrice <= 0)) ||
    (avgPrice !== null && avgPrice > 0 && (quantity === null || quantity <= 0))
  )
}

// 시작예정일 검증 (등록 전용) — 서버는 오늘 이전 날짜를 400으로 거부. 오늘 자신은 허용
export function isInvalidScheduledStart(input: {
  initial?: Strategy
  scheduledStartDate: string | null
}): boolean {
  return !input.initial && input.scheduledStartDate !== null && input.scheduledStartDate < todayKst()
}

// VR 필수 필드 유효성 검사 — API 등록 정책과 동일하게 초기 V/시드는 0을 허용하되 모드별 자산 조건을 적용
export function isInvalidVr(input: {
  isVr: boolean
  vrFields: VrFields
  recurringMode: VrRecurringMode
  vrDerived: VrDerived
}): boolean {
  const { isVr, vrFields, recurringMode, vrDerived } = input
  const { intervalWeeks, bandWidth, recurringAmount, gStepWeeks, gMax, poolLimitFloor, initialPoolLimitRate, pStepWeeks } = vrFields
  const { recurringMagnitude, normalizedRecurringAmount, initialAssets, evaluatedAssets, requiredWithdrawalAssets, effectiveInitialGradient } = vrDerived
  return isVr && (
    intervalWeeks === null ||
    intervalWeeks < 1 ||
    !Number.isInteger(intervalWeeks) ||
    bandWidth === null ||
    bandWidth <= 0 ||
    (recurringAmount !== null && !Number.isInteger(recurringAmount)) ||
    (recurringMode !== 'HOLD' && recurringMagnitude <= 0) ||
    (normalizedRecurringAmount <= 0 && initialAssets <= 0) ||
    (normalizedRecurringAmount < 0 && evaluatedAssets < requiredWithdrawalAssets) ||
    (gStepWeeks !== 0 && gMax !== null && gMax < effectiveInitialGradient) ||
    (poolLimitFloor !== null && initialPoolLimitRate !== null && poolLimitFloor > initialPoolLimitRate) ||
    // poolLimitRate 단계주기가 0(램프 비활성화)이 아니면 하한은 0보다 커야 함 — 단계주기=0일 때만 하한 0이 허용(자동 강제)
    (poolLimitFloor === 0 && pStepWeeks !== 0)
  )
}

export function isRuntimeValueInvalid(input: {
  initial?: Strategy
  runtimeStrategy?: RuntimeStrategySettings
  ticker: string
  divisionCountSettings?: RuntimeFieldSettings<number>
  divisionCount: DivisionCount
  isVr: boolean
  bandWidth: number | null
  intervalWeeks: number | null
  recurringMode: VrRecurringMode
}): boolean {
  const { initial, runtimeStrategy, ticker, divisionCountSettings, divisionCount, isVr, bandWidth, intervalWeeks, recurringMode } = input
  return !initial && !!runtimeStrategy && (
    !runtimeStrategy.fields.ticker.allowedValues.includes(ticker) ||
    (!!divisionCountSettings && !divisionCountSettings.allowedValues.includes(divisionCount)) ||
    (isVr && !!runtimeStrategy.fields.bandWidth && bandWidth !== null &&
      !runtimeStrategy.fields.bandWidth.allowedValues.includes(bandWidth)) ||
    (isVr && !!runtimeStrategy.fields.intervalWeeks && intervalWeeks !== null &&
      !runtimeStrategy.fields.intervalWeeks.allowedValues.includes(intervalWeeks)) ||
    (isVr && !!runtimeStrategy.fields.recurringMode && (
      !runtimeStrategy.fields.recurringMode.allowedValues.includes(recurringMode) ||
      (!runtimeStrategy.fields.recurringMode.customizable &&
        runtimeStrategy.fields.recurringMode.defaultValue !== recurringMode)
    ))
  )
}

// cannotSubmit — 제출 차단 여부. submitDisabledReason과 완전 동치가 아님을 유지(비VR runtime invalid는 차단하지만 reason 없음 등)
export function computeCannotSubmit(input: {
  initial?: Strategy
  canEditSeed: boolean
  runtimeConfigUnavailable: boolean
  isRuntimeValueInvalid: boolean
  isInvalidBootstrap: boolean
  isInvalidScheduledStart: boolean
  isInvalidVr: boolean
  isBelowMinSeed: boolean
  isVr: boolean
  isInvalidSeed: boolean
  basePrice: number | null
  seedUnavailableReason: string | null
}): boolean {
  const {
    initial, canEditSeed, runtimeConfigUnavailable, isRuntimeValueInvalid, isInvalidBootstrap,
    isInvalidScheduledStart, isInvalidVr, isBelowMinSeed, isVr, isInvalidSeed, basePrice, seedUnavailableReason,
  } = input
  return initial && !canEditSeed
    ? false
    : runtimeConfigUnavailable || isRuntimeValueInvalid || isInvalidBootstrap || isInvalidScheduledStart || isInvalidVr || isBelowMinSeed || (!isVr && isInvalidSeed) || (!isVr && basePrice === null && seedUnavailableReason === null)
}

// submitDisabledReason의 사전 사유(resolver 거부 사유는 호출부에서 ?? 로 이어붙임).
// 분기 순서는 특정 메시지를 검증하는 테스트에 의해 고정 — 재배열 금지.
export function computeSubmitDisabledReason(input: {
  initial?: Strategy
  canEditSeed: boolean
  runtimeConfigUnavailable: boolean
  isInvalidScheduledStart: boolean
  isVr: boolean
  vrFields: VrFields
  recurringMode: VrRecurringMode
  vrDerived: VrDerived
  isRuntimeValueInvalid: boolean
  seedUnavailableReason: string | null
  isBelowMinSeed: boolean
  minSeed: number | null
  isInvalidSeed: boolean
  basePrice: number | null
}): string | null {
  const {
    initial, canEditSeed, runtimeConfigUnavailable, isInvalidScheduledStart, isVr, vrFields, recurringMode,
    vrDerived, isRuntimeValueInvalid, seedUnavailableReason, isBelowMinSeed, minSeed, isInvalidSeed, basePrice,
  } = input
  const { avgPrice, quantity, intervalWeeks, bandWidth, recurringAmount, gStepWeeks, gMax, poolLimitFloor, initialPoolLimitRate, pStepWeeks } = vrFields
  const { recurringMagnitude, normalizedRecurringAmount, initialAssets, evaluatedAssets, requiredWithdrawalAssets, effectiveInitialGradient } = vrDerived
  return initial && !canEditSeed
    ? null
    : runtimeConfigUnavailable
      ? '현재 등록 가능한 전략이 없습니다.'
      : avgPrice !== null && avgPrice < 0
      ? '평단가는 0 이상이어야 합니다.'
      : quantity !== null && quantity < 0
      ? '수량은 0 이상이어야 합니다.'
      : quantity !== null && !Number.isInteger(quantity)
      ? '수량은 정수여야 합니다.'
      : quantity !== null && quantity > 0 && (avgPrice === null || avgPrice <= 0)
      ? '보유 수량을 입력하면 평단가는 0보다 커야 합니다.'
      : avgPrice !== null && avgPrice > 0 && (quantity === null || quantity <= 0)
      ? '평단가를 입력하면 수량은 0보다 커야 합니다.'
      : isInvalidScheduledStart
      ? '시작예정일은 오늘 이후여야 합니다.'
      : isVr
      ? (() => {
          if (intervalWeeks === null || intervalWeeks < 1 || !Number.isInteger(intervalWeeks)) {
            return '리밸런싱 주기는 1 이상 정수여야 합니다.'
          }
          if (bandWidth === null || bandWidth <= 0) return '밴드 폭은 0보다 커야 합니다.'
          if (recurringAmount !== null && !Number.isInteger(recurringAmount)) {
            return '적립금(+)/인출금(-)은 정수여야 합니다.'
          }
          if (recurringMode !== 'HOLD' && recurringMagnitude <= 0) {
            return recurringMode === 'DEPOSIT'
              ? '적립 금액을 0보다 크게 입력하세요.'
              : '인출 금액을 0보다 크게 입력하세요.'
          }
          if (normalizedRecurringAmount <= 0 && initialAssets <= 0) {
            // 등록 모드는 평단가·수량 입력 필드가 있어 "수량"으로 안내, 수정 모드는 해당 입력이 없어 읽기전용 "초기 V값" 문구 유지
            return initial
              ? '거치식/인출식은 초기 V값 또는 초기 시드가 0보다 커야 합니다.'
              : '거치식/인출식은 수량 또는 초기 시드가 0보다 커야 합니다.'
          }
          if (normalizedRecurringAmount < 0 && evaluatedAssets < requiredWithdrawalAssets) {
            return `인출식은 초기 자산이 $${fmtUsd(requiredWithdrawalAssets)} 이상이어야 합니다.`
          }
          if (gStepWeeks !== 0 && gMax !== null && gMax < effectiveInitialGradient) {
            return 'gradient 상한은 초기값 이상이어야 합니다.'
          }
          if (poolLimitFloor !== null && initialPoolLimitRate !== null && poolLimitFloor > initialPoolLimitRate) {
            return 'poolLimitRate 하한은 초기값 이하여야 합니다.'
          }
          if (poolLimitFloor === 0 && pStepWeeks !== 0) {
            return POOL_LIMIT_FLOOR_ZERO_MESSAGE
          }
          if (isRuntimeValueInvalid) return '현재 허용되지 않는 설정이 선택되었습니다.'
          return null
        })()
      : (() => {
          if (seedUnavailableReason === 'NO_PRIVACY_BASE') return 'P 매매표가 없어 등록할 수 없습니다.'
          if (isBelowMinSeed && minSeed !== null) return `최소 시드 $${fmtUsd(minSeed)} 이상이 필요합니다.`
          if (isInvalidSeed) return '예수금은 0보다 커야 합니다.'
          if (basePrice === null && seedUnavailableReason === null) return '기준 가격을 불러오는 중입니다.'
          return null
        })()
}
