'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useStrategySeedPreviewQuery } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import type { BrokerCode, PriceMap } from '@entities/account'
import type { RuntimeFieldSettings, RuntimeStrategyType } from '@entities/runtime-config'
import { useStrategyFormData } from './useStrategyFormData'
import { useSeedModel } from './useSeedModel'
import { computeVrDerived } from './vrDerived'
import type { VrRecurringMode } from './vrDerived'
import { isInvalidBootstrap, isInvalidScheduledStart, isInvalidVr, isRuntimeValueInvalid, computeCannotSubmit, computeSubmitDisabledReason } from './strategyFormGuards'
import { buildStrategyPayload } from './buildStrategyPayload'
import { useTypeDefaults } from './useTypeDefaults'
import { buildStrategyFormDefaults, createFormSetters, deriveRuntimeFields, deriveSeedPreview, findUsdDeposit, toCycleSeedType, watchVrFields } from './strategyFormHelpers'
import { useInitialSeedReset, useInitializing, useLoadFailToast, useStrategyMutations } from './useStrategyFormEffects'
import { strategyFormSchema, type DivisionCount, type StrategyFormValues } from './strategyFormSchema'

interface UseStrategyFormOptions {
  accountId: string
  broker?: BrokerCode
  initial?: Strategy
  onSuccess?: () => void
}

// VR 전략 전용 폼 필드 (avgPrice·quantity는 "중간부터 시작" 공통 필드 — VR 외 전략도 사용)
export interface VrFields {
  avgPrice: number | null
  quantity: number | null
  intervalWeeks: number | null
  bandWidth: number | null
  recurringAmount: number | null
  initialValue: number | null
  initialGradient: number | null
  gGraceWeeks: number | null
  gStepWeeks: number | null
  gMax: number | null
  initialPoolLimitRate: number | null
  pGraceWeeks: number | null
  pStepWeeks: number | null
  poolLimitFloor: number | null
}

export interface UseStrategyFormReturn {
  type: string
  setType: (t: string) => void
  usesDivisionCount: boolean
  requiresPrivacyBase: boolean
  canEditSeed: boolean
  seedUnavailableReason: string | null

  ticker: string
  availableTickers: string[]
  handleTickerChange: (code: string) => void
  basePrice: number | null
  prices: PriceMap | null

  pct: number
  setPct: (p: number) => void
  seedUsdInput: number | null
  setSeedUsdInput: (v: number | null) => void
  usdDeposit: number | null
  minSeed: number | null
  isBelowMinSeed: boolean
  loadingBase: boolean
  balanceCheckEnabled: boolean
  isMock: boolean

  autoStart: boolean
  setAutoStart: (v: boolean) => void
  seedMode: 'KEEP' | 'MAX'
  setSeedMode: (m: 'KEEP' | 'MAX') => void

  divisionCount: DivisionCount
  setDivisionCount: (n: DivisionCount) => void
  divisionCountSettings?: RuntimeFieldSettings<number>
  tickerCustomizable: boolean
  enabledStrategyTypes: string[]
  runtimeConfigUnavailable: boolean
  runtimeConfigError: boolean
  retryRuntimeConfig: () => void

  // VR 전략 전용
  isVr: boolean
  vrFields: VrFields
  setVrField: (field: keyof VrFields, value: number | null) => void
  recurringMode: VrRecurringMode
  setRecurringMode: (mode: VrRecurringMode) => void
  // 램프 파라미터 미입력 시 서버로 전송될 실제값 — "자동" 플레이스홀더에 표시
  vrRampDefaults: {
    initialGradient: number
    gMax: number
    initialPoolLimitRate: number
    poolLimitFloor: number
  }
  vrSettings: {
    recurringMode?: RuntimeFieldSettings<string>
    bandWidth?: RuntimeFieldSettings<number>
    intervalWeeks?: RuntimeFieldSettings<number>
  }

  // 시작예정일 — 세 전략 공통, 등록 전용
  scheduledStartDate: string | null
  setScheduledStartDate: (date: string | null) => void

  loading: boolean
  initializing: boolean
  cannotSubmit: boolean
  submitDisabledReason: string | null
  handleSubmit: (e: React.FormEvent) => void
}

export function useStrategyForm({
  accountId,
  broker,
  initial,
  onSuccess,
}: UseStrategyFormOptions): UseStrategyFormReturn {
  const queryClient = useQueryClient()
  const {
    isMock, meta, findStrategyType, runtimeQuery, runtimeConfig, enabledStrategyTypes,
    balanceCheckEnabled, marginItems, marginLoading, marginError, prices, pricesError,
  } = useStrategyFormData(accountId, broker)

  const { submit, loading } = useStrategyMutations({ queryClient, accountId, initial, onSuccess })

  // react-hook-form — type/ticker/autoStart/seedMode/divisionCount + VR 필드 관리
  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(strategyFormSchema),
    defaultValues: buildStrategyFormDefaults(initial, meta.strategyTypes[0]?.code),
  })
  const [resolverValidationReason, setResolverValidationReason] = useState<string | null>(null)

  useEffect(() => {
    const subscription = form.watch(() => setResolverValidationReason(null))
    return () => subscription.unsubscribe()
  }, [form])

  const type = form.watch('type')
  const ticker = form.watch('ticker')
  const autoStart = form.watch('autoStart')
  const seedMode = form.watch('seedMode')
  const divisionCount = form.watch('divisionCount')
  const canEditSeed = !!initial && (initial.currentHoldings ?? 0) === 0

  const vrFields = watchVrFields(form)
  const {
    avgPrice, quantity, intervalWeeks, bandWidth, recurringAmount, initialValue,
    initialGradient, gMax, initialPoolLimitRate, poolLimitFloor,
  } = vrFields
  const recurringMode = form.watch('recurringMode')
  const scheduledStartDate = form.watch('scheduledStartDate') ?? null
  const isVr = type === 'VR'

  const typeMeta = useMemo(() => findStrategyType(type), [findStrategyType, type])
  const runtimeStrategy = runtimeConfig?.strategies[type as RuntimeStrategyType]
  const {
    availableTickers, divisionCountSettings, usesDivisionCount, tickerCustomizable, vrSettings,
  } = deriveRuntimeFields(initial, runtimeStrategy)
  const requiresPrivacyBase = typeMeta?.requiresPrivacyBase ?? false

  const seedPreview = useStrategySeedPreviewQuery(
    accountId,
    { type, ticker, divisionCount },
    { enabled: !!type && !!ticker && !isVr },
  )
  const { basePrice, minSeed, seedUnavailableReason } = deriveSeedPreview(isVr, seedPreview.data)
  const loadingBase = seedPreview.isLoading || marginLoading

  const usdDeposit = findUsdDeposit(marginItems)

  const initializing = useInitializing(loadingBase, initial, runtimeQuery.isLoading)

  useLoadFailToast(isMock, marginError, pricesError)

  const {
    pct, setPct,
    seedUsdInput, setSeedUsdInput,
    resetSeed,
    seedUsd,
    isBelowMinSeed, isInvalidSeed,
  } = useSeedModel({ balanceCheckEnabled, initial, editableEdit: canEditSeed, usdDeposit, minSeed, avgPrice, quantity })

  // type 변경 시 ticker·VR 기본값 설정 (effect + setType 공용) — 시드는 minSeed effect에서 처리
  const { setType } = useTypeDefaults({ form, initial, runtimeConfig, enabledStrategyTypes, availableTickers })

  useInitialSeedReset({ initial, minSeed, usdDeposit, balanceCheckEnabled, isVr, resetSeed })

  const vrDerived = computeVrDerived({
    initial, avgPrice, quantity, initialValue, seedUsd,
    recurringMode, recurringAmount, intervalWeeks, initialGradient,
    gMax, initialPoolLimitRate, poolLimitFloor,
  })

  const invalidBootstrap = isInvalidBootstrap({ initial, avgPrice, quantity })
  const invalidScheduledStart = isInvalidScheduledStart({ initial, scheduledStartDate })
  const invalidVr = isInvalidVr({ isVr, vrFields, recurringMode, vrDerived })
  const runtimeValueInvalid = isRuntimeValueInvalid({
    initial, runtimeStrategy, ticker, divisionCountSettings, divisionCount, isVr, bandWidth, intervalWeeks, recurringMode,
  })

  const runtimeConfigUnavailable = !initial && (!runtimeConfig || enabledStrategyTypes.length === 0)
  const cannotSubmit = computeCannotSubmit({
    initial, canEditSeed, runtimeConfigUnavailable,
    isRuntimeValueInvalid: runtimeValueInvalid,
    isInvalidBootstrap: invalidBootstrap,
    isInvalidScheduledStart: invalidScheduledStart,
    isInvalidVr: invalidVr,
    isBelowMinSeed, isVr, isInvalidSeed, basePrice, seedUnavailableReason,
  })

  const preSubmitDisabledReason = computeSubmitDisabledReason({
    initial, canEditSeed, runtimeConfigUnavailable,
    isInvalidScheduledStart: invalidScheduledStart,
    isVr, vrFields, recurringMode, vrDerived,
    isRuntimeValueInvalid: runtimeValueInvalid,
    seedUnavailableReason, isBelowMinSeed, minSeed, isInvalidSeed, basePrice,
  })

  const submitDisabledReason = preSubmitDisabledReason ?? resolverValidationReason

  const cycleSeedType = toCycleSeedType(isVr, autoStart, seedMode)

  const setters = createFormSetters(form)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    form.handleSubmit(() => {
      submit(buildStrategyPayload({
        initial, type, ticker, cycleSeedType, seedUsd, canEditSeed, isVr,
        usesDivisionCount, divisionCount, divisionCountSettings, runtimeStrategy,
        vrFields, vrDerived, scheduledStartDate,
      }))
    }, () => {
      setResolverValidationReason('입력값을 다시 확인해 주세요.')
    })(e)
  }

  return {
    ...setters,
    type, setType, usesDivisionCount, requiresPrivacyBase, canEditSeed, seedUnavailableReason,
    ticker, availableTickers, basePrice, prices,
    pct, setPct, seedUsdInput, setSeedUsdInput, usdDeposit, minSeed, isBelowMinSeed, loadingBase,
    balanceCheckEnabled,
    isMock,
    autoStart, seedMode,
    divisionCount, divisionCountSettings, tickerCustomizable,
    enabledStrategyTypes, runtimeConfigUnavailable,
    runtimeConfigError: runtimeQuery.isError,
    retryRuntimeConfig: () => { void runtimeQuery.refetch() },
    isVr, vrFields, recurringMode,
    vrRampDefaults: {
      initialGradient: vrDerived.effectiveInitialGradient,
      gMax: vrDerived.effectiveGMax,
      initialPoolLimitRate: vrDerived.effectiveInitialPoolLimitRate,
      poolLimitFloor: vrDerived.effectivePoolLimitFloor,
    },
    vrSettings,
    scheduledStartDate,
    loading,
    initializing,
    cannotSubmit,
    submitDisabledReason,
    handleSubmit,
  }
}
