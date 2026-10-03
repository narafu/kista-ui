'use client'

import { useState } from 'react'
import { apiMsg } from '@shared/lib/api-client'
import { useMeta } from '@entities/meta'
import { useBacktestMutation } from '@entities/backtest'
import type { BacktestParams, BacktestType } from '@entities/backtest'
import { useRuntimeConfigQuery } from '@entities/runtime-config'
import type { RuntimeStrategyType } from '@entities/runtime-config'
import { EMPTY_VR_RAMP, POOL_LIMIT_FLOOR_ZERO_MESSAGE, RAMP_DEFAULTS_BY_MODE } from '@entities/strategy'
import type { VrRampValues, VrRecurringMode } from '@entities/strategy'

// 운영 전략 등록과 같은 범위로 백테스트한다 — 분할 수·밴드 폭·주기·적립 모드의 선택지와 기본값은 runtime-config가 SSOT.
// 사용자가 고르지 않은 값은 state에 복사하지 않고(null) 읽는 시점에 runtime 기본값으로 파생한다(서버 상태를 useState에 미러링 금지)
export function useBacktestForm() {
  const { meta } = useMeta()
  const { data: runtimeConfig, isError: runtimeConfigError } = useRuntimeConfigQuery()
  const mutation = useBacktestMutation()

  const [type, setTypeState] = useState<BacktestType>('INFINITE')
  const [tickerOverride, setTicker] = useState<string | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [seed, setSeed] = useState<number | null>(null)
  const [avgPrice, setAvgPrice] = useState<number | null>(null)
  const [quantity, setQuantity] = useState<number | null>(null)
  const [divisionCountOverride, setDivisionCount] = useState<number | null>(null)
  const [bandWidthOverride, setVrBandWidth] = useState<number | null>(null)
  const [intervalWeeksOverride, setVrIntervalWeeks] = useState<number | null>(null)
  const [recurringModeOverride, setVrRecurringMode] = useState<VrRecurringMode | null>(null)
  const [vrRecurringAmountAbs, setVrRecurringAmountAbs] = useState<number | null>(null)
  const [vrInitialValue, setVrInitialValue] = useState<number | null>(null)
  const [vrRamp, setVrRamp] = useState<VrRampValues>(EMPTY_VR_RAMP)

  const typeMeta = meta.strategyTypes.find((t) => t.code === type)
  const settings = runtimeConfig?.strategies[type as RuntimeStrategyType]?.fields
  const availableTickers = typeMeta?.availableTickers ?? []
  const ticker = tickerOverride ?? settings?.ticker.defaultValue ?? availableTickers[0] ?? ''
  const divisionCountOptions = settings?.divisionCount?.allowedValues ?? typeMeta?.divisionCounts ?? []
  const divisionCount = divisionCountOverride ?? settings?.divisionCount?.defaultValue ?? divisionCountOptions[0] ?? null
  const vrBandWidth = bandWidthOverride ?? settings?.bandWidth?.defaultValue ?? null
  const vrIntervalWeeks = intervalWeeksOverride ?? settings?.intervalWeeks?.defaultValue ?? null
  const vrRecurringMode: VrRecurringMode = recurringModeOverride ?? settings?.recurringMode?.defaultValue ?? 'HOLD'
  const rampDefaults = RAMP_DEFAULTS_BY_MODE[vrRecurringMode]

  function setVrRampField(field: keyof VrRampValues, value: number | null) {
    setVrRamp((prev) => ({ ...prev, [field]: value }))
  }

  function setType(next: BacktestType) {
    setTypeState(next)
    setTicker(null)
    setDivisionCount(null)
    setVrBandWidth(null)
    setVrIntervalWeeks(null)
    setVrRecurringMode(null)
    setVrRecurringAmountAbs(null)
    setVrInitialValue(null)
    setVrRamp(EMPTY_VR_RAMP)
  }

  const vrRecurringAmount =
    vrRecurringMode === 'HOLD' ? 0 : vrRecurringMode === 'WITHDRAW' ? -(vrRecurringAmountAbs ?? 0) : (vrRecurringAmountAbs ?? 0)

  function getSubmitDisabledReason(): string | null {
    if (!ticker) return '종목을 선택하세요'
    if (!from || !to) return '기간을 선택하세요'
    if (from > to) return '시작일이 종료일보다 늦을 수 없습니다'
    if (avgPrice != null && avgPrice < 0) return '평단가는 0 이상이어야 합니다'
    if (quantity != null && quantity < 0) return '수량은 0 이상이어야 합니다'
    const hasSeed = seed != null && seed > 0
    const hasHoldings = quantity != null && quantity > 0
    if (!hasSeed && !hasHoldings) return '예수금 또는 평단가·수량 중 하나는 입력하세요'
    if (hasHoldings && (avgPrice == null || avgPrice <= 0)) return '수량을 입력했다면 평단가도 입력하세요'
    if (avgPrice != null && avgPrice > 0 && !hasHoldings) return '평단가를 입력했다면 수량도 입력하세요'
    if (type === 'INFINITE' && divisionCountOptions.length > 0 && divisionCount == null) {
      return '분할 수를 선택하세요'
    }
    if (type === 'VR') {
      // VR 선택지(밴드 폭·주기·적립 모드)는 runtime-config에서만 온다 — 없으면 고를 수 없으니 원인을 안내
      if (!settings) {
        return runtimeConfigError
          ? 'VR 설정값을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요'
          : 'VR 설정값을 불러오는 중입니다'
      }
      if (vrBandWidth == null || vrBandWidth <= 0) return 'VR 밴드 폭을 선택하세요'
      if (vrIntervalWeeks == null || vrIntervalWeeks <= 0) return 'VR 리밸런싱 주기를 선택하세요'
      // 초기 V는 선택 — 비우면 서버가 첫 거래일 종가×보유수량으로 산출한다(운영 등록과 같은 규칙)
      if (vrInitialValue != null && vrInitialValue < 0) return 'VR 초기 V값은 0 이상이어야 합니다'
      if (vrRecurringMode !== 'HOLD' && !vrRecurringAmountAbs) return '적립/인출 금액을 입력하세요'
      // 서버 Integer 필드 — 소수 입력은 보존하고 여기서 차단(전략 등록 폼과 같은 방식)
      const integerRampFields = [vrRamp.initialGradient, vrRamp.gGraceWeeks, vrRamp.gStepWeeks, vrRamp.gMax, vrRamp.pGraceWeeks, vrRamp.pStepWeeks]
      if (integerRampFields.some((v) => v != null && !Number.isInteger(v))) return 'gradient와 주 단위 값은 정수로 입력하세요'
      // 램프 검증 — 전략 등록(isInvalidVr)·서버 validateVrCommand와 같은 규칙
      const effectiveInitialGradient = vrRamp.initialGradient ?? rampDefaults.initialGradient
      const effectiveInitialPoolLimitRate = vrRamp.initialPoolLimitRate ?? rampDefaults.initialPoolLimitRate
      if (effectiveInitialPoolLimitRate > 1) return '초기 poolLimitRate는 100% 이하여야 합니다'
      if (vrRamp.gStepWeeks !== 0 && vrRamp.gMax != null && vrRamp.gMax < effectiveInitialGradient) {
        return 'gradient 상한은 초기 gradient 이상이어야 합니다'
      }
      if (vrRamp.poolLimitFloor != null && vrRamp.poolLimitFloor > effectiveInitialPoolLimitRate) {
        return 'poolLimitRate 하한은 초기 poolLimitRate 이하여야 합니다'
      }
      if (vrRamp.poolLimitFloor === 0 && vrRamp.pStepWeeks !== 0) return POOL_LIMIT_FLOOR_ZERO_MESSAGE
    }
    return null
  }
  const submitDisabledReason = getSubmitDisabledReason()

  function buildParams(): BacktestParams {
    const isVr = type === 'VR'
    const vrRampParam = (value: number | null) => (isVr ? (value ?? undefined) : undefined)
    return {
      type,
      ticker,
      from,
      to,
      seed: seed ?? 0,
      initialHoldings: quantity != null && quantity > 0 ? quantity : undefined,
      initialAvgPrice: quantity != null && quantity > 0 ? (avgPrice ?? undefined) : undefined,
      divisionCount: type === 'INFINITE' ? (divisionCount ?? undefined) : undefined,
      vrBandWidth: isVr ? (vrBandWidth ?? undefined) : undefined,
      vrIntervalWeeks: isVr ? (vrIntervalWeeks ?? undefined) : undefined,
      vrRecurringAmount: isVr ? vrRecurringAmount : undefined,
      vrInitialValue: isVr ? (vrInitialValue ?? undefined) : undefined,
      // 램프 미입력(null)은 생략 — 서버가 운영 등록과 같은 recurringMode별 기본값으로 채운다
      vrInitialGradient: vrRampParam(vrRamp.initialGradient),
      vrGGraceWeeks: vrRampParam(vrRamp.gGraceWeeks),
      vrGStepWeeks: vrRampParam(vrRamp.gStepWeeks),
      vrGMax: vrRampParam(vrRamp.gMax),
      vrInitialPoolLimitRate: vrRampParam(vrRamp.initialPoolLimitRate),
      vrPGraceWeeks: vrRampParam(vrRamp.pGraceWeeks),
      vrPStepWeeks: vrRampParam(vrRamp.pStepWeeks),
      vrPoolLimitFloor: vrRampParam(vrRamp.poolLimitFloor),
    }
  }

  // 결과를 만든 입력과 현재 폼 입력이 다르면 결과가 낡았음을 표시한다 — 값이 바뀔 때마다 결과를 지우지 않고 비교만 한다
  const isResultStale = mutation.variables != null
    && JSON.stringify(mutation.variables) !== JSON.stringify(buildParams())

  function run() {
    if (submitDisabledReason) return
    mutation.mutate(buildParams())
  }

  function reset() {
    setType('INFINITE')
    setFrom('')
    setTo('')
    setSeed(null)
    setAvgPrice(null)
    setQuantity(null)
    mutation.reset()
  }

  return {
    meta,
    type,
    setType,
    ticker,
    setTicker,
    availableTickers,
    from,
    setFrom,
    to,
    setTo,
    seed,
    setSeed,
    avgPrice,
    setAvgPrice,
    quantity,
    setQuantity,
    divisionCount,
    setDivisionCount,
    divisionCountOptions,
    vrSettings: settings,
    vrBandWidth,
    setVrBandWidth,
    vrIntervalWeeks,
    setVrIntervalWeeks,
    vrRecurringMode,
    setVrRecurringMode,
    vrRecurringAmountAbs,
    setVrRecurringAmountAbs,
    vrInitialValue,
    setVrInitialValue,
    vrRamp,
    setVrRampField,
    rampDefaults,
    submitDisabledReason,
    run,
    reset,
    result: mutation.data,
    isResultStale,
    isLoading: mutation.isPending,
    errorMessage: mutation.error ? apiMsg(mutation.error, '백테스트 실행에 실패했습니다. 잠시 후 다시 시도해주세요') : null,
  }
}

export type UseBacktestFormResult = ReturnType<typeof useBacktestForm>
