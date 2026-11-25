import { fmtUsd, todayKst } from '@shared/lib/format'
import { vrRampInvalidReason } from '@entities/strategy'
import type { Strategy, VrRecurringMode } from '@entities/strategy'
import type { StrategyFieldSettings, StrategyTypeMeta } from '@entities/meta'
import type { DivisionCount } from './strategyFormSchema'
import type { VrFields, VrRampDefaults } from './useStrategyForm'
import { signedRecurringAmount } from './strategyFormHelpers'

type RuntimeStrategySettings = Pick<StrategyTypeMeta, 'enabled' | 'fields'>

// 서버 검증과 겹치는 VR 자산 조건의 입력값(2026-11-25 사용자 결정으로 즉시 안내용으로 유지 — 최종 판정은 서버 검증).
// 서버 VrRegistration과 같은 식이지만 V값은 평단가 추정치라 서버(전일종가 기준)와 다를 수 있다
export interface VrAssets {
  recurringMagnitude: number
  normalizedRecurringAmount: number
  initialAssets: number   // 거치·적립 게이트 — 초기 V 입력(>0)이 있으면 그 값
  evaluatedAssets: number // 인출식 최소 자산 — 초기 V 입력을 반영하지 않는다(우회 방지, 서버와 같은 원칙)
  requiredWithdrawalAssets: number
}

export function computeVrAssets(input: {
  initial?: Strategy
  vrFields: VrFields
  seedUsd: number | null
  recurringMode: VrRecurringMode
}): VrAssets {
  const { initial, vrFields: { avgPrice, quantity, initialValue, recurringAmount, intervalWeeks }, seedUsd, recurringMode } = input
  const estimatedStockValue = initial ? initial.vr?.value ?? 0 : (avgPrice ?? 0) * (quantity ?? 0)
  const vrValue = !initial && initialValue !== null && initialValue > 0 ? initialValue : estimatedStockValue
  const normalizedRecurringAmount = signedRecurringAmount(recurringMode, recurringAmount)
  return {
    recurringMagnitude: Math.abs(recurringAmount ?? 0),
    normalizedRecurringAmount,
    initialAssets: vrValue + (seedUsd ?? 0),
    evaluatedAssets: estimatedStockValue + (seedUsd ?? 0),
    requiredWithdrawalAssets: intervalWeeks !== null && intervalWeeks > 0
      ? Math.abs(normalizedRecurringAmount) * 100 * (4 / intervalWeeks)
      : 0,
  }
}

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
  vrAssets: VrAssets
  rampDefaults: VrRampDefaults
}): boolean {
  const { isVr, vrFields, recurringMode, vrAssets, rampDefaults } = input
  const { intervalWeeks, bandWidth, recurringAmount, gStepWeeks, gMax, poolLimitFloor, pStepWeeks } = vrFields
  const { recurringMagnitude, normalizedRecurringAmount, initialAssets, evaluatedAssets, requiredWithdrawalAssets } = vrAssets
  const effectiveInitialGradient = vrFields.initialGradient ?? rampDefaults.initialGradient
  const effectiveInitialPoolLimitRate = vrFields.initialPoolLimitRate ?? rampDefaults.initialPoolLimitRate
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
    (poolLimitFloor !== null && poolLimitFloor > effectiveInitialPoolLimitRate) ||
    // poolLimitRate 단계주기가 0(램프 비활성화)이 아니면 하한은 0보다 커야 함 — 단계주기=0일 때만 하한 0이 허용(자동 강제)
    (poolLimitFloor === 0 && pStepWeeks !== 0)
  )
}

export function isRuntimeValueInvalid(input: {
  initial?: Strategy
  runtimeStrategy?: RuntimeStrategySettings
  ticker: string
  divisionCountSettings?: StrategyFieldSettings<number>
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
  seedCheck: SeedCheck
}): boolean {
  const {
    initial, canEditSeed, runtimeConfigUnavailable, isRuntimeValueInvalid, isInvalidBootstrap,
    isInvalidScheduledStart, isInvalidVr, isBelowMinSeed, isVr, isInvalidSeed, seedCheck,
  } = input
  return initial && !canEditSeed
    ? false
    : runtimeConfigUnavailable || isRuntimeValueInvalid || isInvalidBootstrap || isInvalidScheduledStart || isInvalidVr || isBelowMinSeed || (!isVr && isInvalidSeed) || (!isVr && seedCheck !== 'ok')
}

// 서버가 검증하지 않는 PRIVACY 최소 시드·NO_PRIVACY_BASE(등록)를 판정할 서버 파생값의 상태 — 값이 없으면 제출을 막는다.
// ok: 판정 가능하거나 판정이 필요 없음, loading: 검증 응답 대기, failed: 검증 호출 실패 또는 서버가 미리보기를 계산하지 못함
export type SeedCheck = 'ok' | 'loading' | 'failed'

// 제출 불가 사유를 표시할 입력칸 — null이면 폼 하단에 둔다(여러 칸에 걸친 사유, 접힌 고급 설정 안의 밴드 폭·주기·램프)
export type SubmitReasonField = 'holdings' | 'scheduledStart' | 'recurring'

export interface SubmitDisabled {
  message: string
  field: SubmitReasonField | null
}

const reason = (message: string, field: SubmitReasonField | null = null): SubmitDisabled => ({ message, field })

// submitDisabledReason의 사전 사유(resolver 거부 사유는 호출부에서 ?? 로 이어붙임).
// 분기 순서는 특정 메시지를 검증하는 테스트에 의해 고정 — 재배열 금지.
export function computeSubmitDisabled(input: {
  initial?: Strategy
  canEditSeed: boolean
  runtimeConfigUnavailable: boolean
  isInvalidScheduledStart: boolean
  isVr: boolean
  vrFields: VrFields
  recurringMode: VrRecurringMode
  vrAssets: VrAssets
  rampDefaults: VrRampDefaults
  isRuntimeValueInvalid: boolean
  seedUnavailableReason: string | null
  isBelowMinSeed: boolean
  minSeed: number | null
  isInvalidSeed: boolean
  seedCheck: SeedCheck
}): SubmitDisabled | null {
  const {
    initial, canEditSeed, runtimeConfigUnavailable, isInvalidScheduledStart, isVr, vrFields, recurringMode,
    vrAssets, rampDefaults, isRuntimeValueInvalid, seedUnavailableReason, isBelowMinSeed, minSeed, isInvalidSeed, seedCheck,
  } = input
  const { avgPrice, quantity, intervalWeeks, bandWidth, recurringAmount, gStepWeeks, gMax, poolLimitFloor, pStepWeeks } = vrFields
  const { recurringMagnitude, normalizedRecurringAmount, initialAssets, evaluatedAssets, requiredWithdrawalAssets } = vrAssets
  const effectiveInitialGradient = vrFields.initialGradient ?? rampDefaults.initialGradient
  const effectiveInitialPoolLimitRate = vrFields.initialPoolLimitRate ?? rampDefaults.initialPoolLimitRate
  return initial && !canEditSeed
    ? null
    : runtimeConfigUnavailable
      ? reason('현재 등록 가능한 전략이 없습니다.')
      : avgPrice !== null && avgPrice < 0
      ? reason('평단가는 0 이상이어야 합니다.', 'holdings')
      : quantity !== null && quantity < 0
      ? reason('수량은 0 이상이어야 합니다.', 'holdings')
      : quantity !== null && !Number.isInteger(quantity)
      ? reason('수량은 정수여야 합니다.', 'holdings')
      : quantity !== null && quantity > 0 && (avgPrice === null || avgPrice <= 0)
      ? reason('보유 수량을 입력하면 평단가는 0보다 커야 합니다.', 'holdings')
      : avgPrice !== null && avgPrice > 0 && (quantity === null || quantity <= 0)
      ? reason('평단가를 입력하면 수량은 0보다 커야 합니다.', 'holdings')
      : isInvalidScheduledStart
      ? reason('시작예정일은 오늘 이후여야 합니다.', 'scheduledStart')
      : isVr
      ? (() => {
          if (intervalWeeks === null || intervalWeeks < 1 || !Number.isInteger(intervalWeeks)) {
            return reason('리밸런싱 주기는 1 이상 정수여야 합니다.')
          }
          if (bandWidth === null || bandWidth <= 0) return reason('밴드 폭은 0보다 커야 합니다.')
          if (recurringAmount !== null && !Number.isInteger(recurringAmount)) {
            return reason('적립금(+)/인출금(-)은 정수여야 합니다.', 'recurring')
          }
          if (recurringMode !== 'HOLD' && recurringMagnitude <= 0) {
            return reason(recurringMode === 'DEPOSIT' ? '적립금을 0보다 크게 입력하세요.' : '인출금을 0보다 크게 입력하세요.', 'recurring')
          }
          if (normalizedRecurringAmount <= 0 && initialAssets <= 0) {
            // 등록 모드는 평단가·수량 입력 필드가 있어 "수량"으로 안내, 수정 모드는 해당 입력이 없어 읽기전용 "초기 V값" 문구 유지
            return reason(initial
              ? '거치식/인출식은 초기 V값 또는 예수금이 0보다 커야 합니다.'
              : '거치식/인출식은 수량 또는 예수금이 0보다 커야 합니다.')
          }
          if (normalizedRecurringAmount < 0 && evaluatedAssets < requiredWithdrawalAssets) {
            return reason(`인출식은 초기 자산이 $${fmtUsd(requiredWithdrawalAssets)} 이상이어야 합니다.`)
          }
          const rampReason = vrRampInvalidReason({
            gStepWeeks, gMax, pStepWeeks, poolLimitFloor,
            initialGradient: effectiveInitialGradient, initialPoolLimitRate: effectiveInitialPoolLimitRate,
          })
          if (rampReason) return reason(rampReason)
          if (isRuntimeValueInvalid) return reason('현재 허용되지 않는 설정이 선택되었습니다.')
          return null
        })()
      : (() => {
          if (seedUnavailableReason === 'NO_PRIVACY_BASE') return reason('P 매매표가 없어 등록할 수 없습니다.')
          if (isBelowMinSeed && minSeed !== null) return reason(`최소 투자금 $${fmtUsd(minSeed)} 이상이 필요합니다.`)
          if (isInvalidSeed) return reason('예수금은 0보다 커야 합니다.')
          if (seedCheck === 'loading') return reason('최소 투자금을 확인하는 중입니다.')
          if (seedCheck === 'failed') return reason('최소 투자금을 확인하지 못했습니다. 다시 시도해주세요.')
          return null
        })()
}
