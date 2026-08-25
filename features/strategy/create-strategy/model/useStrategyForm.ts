'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { isMockBroker } from '@shared/lib/api-schema'
import { useMeta } from '@entities/meta'
import { useAccountMarginQuery, useAccountPricesQuery } from '@entities/account'
import { useCreateStrategyMutation, useUpdateStrategyMutation, useStrategySeedPreviewQuery } from '@entities/strategy'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { tradeKeys } from '@entities/trade'
import type { CycleSeedType, Strategy } from '@entities/strategy'
import type { BrokerCode, PriceMap } from '@entities/account'
import { useMeQuery } from '@entities/user'
import { useRuntimeConfigQuery } from '@entities/runtime-config'
import type { RuntimeFieldSettings, RuntimeStrategyType } from '@entities/runtime-config'
import { useSeedModel } from './useSeedModel'
import { computeVrDerived } from './vrDerived'
import type { VrRecurringMode } from './vrDerived'
import { isInvalidBootstrap, isInvalidScheduledStart, isInvalidVr, isRuntimeValueInvalid, computeCannotSubmit, computeSubmitDisabledReason } from './strategyFormGuards'
import { buildStrategyPayload } from './buildStrategyPayload'
import { useTypeDefaults } from './useTypeDefaults'
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
  const isMock = isMockBroker(broker)
  const { meta, findStrategyType } = useMeta()
  const runtimeQuery = useRuntimeConfigQuery()
  const runtimeConfig = runtimeQuery.data
  const enabledStrategyTypes = meta.strategyTypes
    .filter(({ code }) => runtimeConfig?.strategies[code as RuntimeStrategyType]?.enabled === true)
    .map(({ code }) => code)

  const handleMutationSuccess = async () => {
    toast.success(initial ? '전략이 수정되었습니다' : '전략이 등록되었습니다')
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orderKeys.all }).catch(() => null),
      queryClient.invalidateQueries({ queryKey: statsKeys.all }).catch(() => null),
      queryClient.invalidateQueries({ queryKey: tradeKeys.all }).catch(() => null),
    ])
    onSuccess?.()
  }
  const createMutation = useCreateStrategyMutation(accountId, handleMutationSuccess)
  const updateMutation = useUpdateStrategyMutation(initial?.id ?? '', handleMutationSuccess)
  const initialDivisionCount: DivisionCount = initial?.divisionCount ?? 1

  // react-hook-form — type/ticker/autoStart/seedMode/divisionCount + VR 필드 관리
  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(strategyFormSchema),
    defaultValues: {
      // eslint-disable-next-line react-doctor/no-event-handler
      type: initial?.type ?? meta.strategyTypes[0]?.code ?? '',
      ticker: initial?.ticker ?? '',
      autoStart: initial ? initial.cycleSeedType !== 'NONE' : true,
      seedMode: initial?.cycleSeedType === 'MAINTAIN' ? 'KEEP' : 'MAX',
      divisionCount: initialDivisionCount,
      // 중간부터 시작(평단가·수량)은 등록 전용 — 수정 모드에서는 역산 불가하므로 항상 빈 값
      avgPrice: null,
      quantity: null,
      intervalWeeks: initial?.vr?.intervalWeeks ?? 2,
      bandWidth: initial?.vr?.bandWidth ?? 15,
      recurringAmount: Math.abs(initial?.vr?.recurringAmount ?? 0),
      recurringMode: initial?.vr?.recurringAmount
        ? initial.vr.recurringAmount < 0 ? 'WITHDRAW' : 'DEPOSIT'
        : 'HOLD',
      initialValue: null,
      initialGradient: initial?.vr?.initialGradient ?? null,
      gGraceWeeks: initial?.vr?.gGraceWeeks ?? null,
      gStepWeeks: initial?.vr?.gStepWeeks ?? null,
      gMax: initial?.vr?.gMax ?? null,
      initialPoolLimitRate: initial?.vr?.initialPoolLimitRate ?? null,
      pGraceWeeks: initial?.vr?.pGraceWeeks ?? null,
      pStepWeeks: initial?.vr?.pStepWeeks ?? null,
      poolLimitFloor: initial?.vr?.poolLimitFloor ?? null,
      // 시작예정일도 등록 전용 — 수정 모드에서는 항상 빈 값
      scheduledStartDate: null,
    },
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

  // VR 필드 watch (avgPrice·quantity는 중간부터 시작 공통 필드)
  const avgPrice = form.watch('avgPrice') ?? null
  const quantity = form.watch('quantity') ?? null
  const intervalWeeks = form.watch('intervalWeeks') ?? null
  const bandWidth = form.watch('bandWidth') ?? null
  const recurringAmount = form.watch('recurringAmount') ?? null
  const recurringMode = form.watch('recurringMode')
  const initialValue = form.watch('initialValue') ?? null
  const scheduledStartDate = form.watch('scheduledStartDate') ?? null
  const initialGradient = form.watch('initialGradient') ?? null
  const gGraceWeeks = form.watch('gGraceWeeks') ?? null
  const gStepWeeks = form.watch('gStepWeeks') ?? null
  const gMax = form.watch('gMax') ?? null
  const initialPoolLimitRate = form.watch('initialPoolLimitRate') ?? null
  const pGraceWeeks = form.watch('pGraceWeeks') ?? null
  const pStepWeeks = form.watch('pStepWeeks') ?? null
  const poolLimitFloor = form.watch('poolLimitFloor') ?? null
  const isVr = type === 'VR'
  const vrFields: VrFields = {
    avgPrice, quantity, intervalWeeks, bandWidth, recurringAmount, initialValue,
    initialGradient, gGraceWeeks, gStepWeeks, gMax,
    initialPoolLimitRate, pGraceWeeks, pStepWeeks, poolLimitFloor,
  }

  // capability 파생 — isInfinite 휴리스틱 대신 백엔드 SSOT 사용
  const typeMeta = useMemo(() => findStrategyType(type), [findStrategyType, type])
  const runtimeStrategy = runtimeConfig?.strategies[type as RuntimeStrategyType]
  const availableTickers = initial ? [initial.ticker] : runtimeStrategy?.fields.ticker.allowedValues ?? []
  const divisionCountSettings = runtimeStrategy?.fields.divisionCount
  const usesDivisionCount = initial ? initial.divisionCount !== undefined : !!divisionCountSettings
  const requiresPrivacyBase = typeMeta?.requiresPrivacyBase ?? false
  const tickerCustomizable = initial ? false : runtimeStrategy?.fields.ticker.customizable ?? false
  const vrSettings = {
    recurringMode: runtimeStrategy?.fields.recurringMode as RuntimeFieldSettings<string> | undefined,
    bandWidth: runtimeStrategy?.fields.bandWidth,
    intervalWeeks: runtimeStrategy?.fields.intervalWeeks,
  }

  const { data: meData } = useMeQuery()
  // 모의계좌는 실제 잔고가 없어 예수금 조회 자체가 무의미 — 항상 수동 입력
  const balanceCheckEnabled = (meData?.balanceCheckEnabled ?? true) && !isMock

  // 잔고검증 OFF면 예수금 불필요 → margin 쿼리 skip
  // eslint-disable-next-line react-doctor/no-event-handler
  const { items: marginItems, isLoading: marginLoading } = useAccountMarginQuery(accountId, {
    enabled: balanceCheckEnabled,
  })

  // 티커 선택 버튼의 가격 표시용 — 여러 ticker 동시 (basePrice 계산엔 미사용)
  const allTickerCodes = useMemo(() => meta.tickers.map((t) => t.code), [meta.tickers])
  const { data: pricesData } = useAccountPricesQuery(accountId, allTickerCodes)
  const prices = pricesData ?? null

  // basePrice/minSeed는 백엔드 계산 — VR 전략은 시드 미리보기 불필요
  const seedPreview = useStrategySeedPreviewQuery(
    accountId,
    { type, ticker, divisionCount },
    { enabled: !!type && !!ticker && !isVr },
  )
  const basePrice = isVr ? null : seedPreview.data?.basePrice ?? null
  const minSeed = isVr ? null : seedPreview.data?.minSeed ?? null
  const seedUnavailableReason = isVr ? null : seedPreview.data?.skipReason ?? null
  const loadingBase = seedPreview.isLoading || marginLoading

  const usdDeposit = marginItems.find((m) => m.currency === 'USD')?.purchasableAmount ?? null

  // 초기 로딩 완료 후엔 true로 고정 — 타입 전환 시 재스켈레톤 방지
  const initRef = useRef(false)
  if (!loadingBase) initRef.current = true
  const initialized = initRef.current

  useEffect(() => {
    if (loadingBase) return
    // 모의계좌는 예수금 조회를 스킵하므로 usdDeposit이 항상 null — 현재가 조회 실패만으로 오탐 방지
    if (isMock) return
    if (usdDeposit === null && prices === null) {
      // eslint-disable-next-line react-doctor/no-event-handler
      toast.error('예수금 / 현재가 조회에 실패했습니다')
    }
  }, [loadingBase]) // eslint-disable-line react-doctor/exhaustive-deps

  const {
    pct, setPct,
    seedUsdInput, setSeedUsdInput,
    resetSeed,
    seedUsd,
    isBelowMinSeed, isInvalidSeed,
  } = useSeedModel({ balanceCheckEnabled, initial, editableEdit: canEditSeed, usdDeposit, minSeed, avgPrice, quantity })

  // type 변경 시 ticker·VR 기본값 설정 (effect + setType 공용) — 시드는 minSeed effect에서 처리
  const { setType } = useTypeDefaults({ form, initial, runtimeConfig, enabledStrategyTypes, availableTickers })

  // 엔드포인트 minSeed 도착/변경 시 시드 게이지 재초기화 (신규 등록 한정)
  useEffect(() => {
    if (initial && !canEditSeed) return
    if (minSeed === null) return
    // eslint-disable-next-line react-doctor/no-pass-data-to-parent
    resetSeed({
      pct: usdDeposit !== null && usdDeposit < minSeed ? 0 : 100,
      seedUsdInput: Math.ceil(minSeed),
    })
  }, [canEditSeed, minSeed]) // eslint-disable-line react-doctor/exhaustive-deps

  // 잔고검증 OFF + VR 신규 등록은 초기 시드를 0으로 시작
  useEffect(() => {
    if (initial) return
    if (balanceCheckEnabled) return
    if (!isVr) return
    // eslint-disable-next-line react-doctor/no-pass-data-to-parent
    resetSeed({ seedUsdInput: 0 })
  }, [balanceCheckEnabled, initial, isVr]) // eslint-disable-line react-doctor/exhaustive-deps

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

  // VR은 cycleSeedType 항상 NONE — 롤오버가 자체 사이클 교체 담당
  const cycleSeedType: CycleSeedType = isVr
    ? 'NONE'
    : !autoStart
      ? 'NONE'
      : seedMode === 'KEEP'
        ? 'MAINTAIN'
        : 'MAX'

  function handleTickerChange(code: string) {
    form.setValue('ticker', code)
  }

  function setAutoStart(v: boolean) {
    form.setValue('autoStart', v)
  }

  function setSeedMode(m: 'KEEP' | 'MAX') {
    form.setValue('seedMode', m)
  }

  function setDivisionCount(n: DivisionCount) {
    form.setValue('divisionCount', n)
  }

  // VR 필드 개별 setter
  function setVrField(field: keyof VrFields, value: number | null) {
    form.setValue(field, field === 'recurringAmount' && value !== null ? Math.abs(value) : value)
  }

  function setRecurringMode(mode: VrRecurringMode) {
    form.setValue('recurringMode', mode)
    if (mode === 'HOLD') form.setValue('recurringAmount', 0)
  }

  function setScheduledStartDate(date: string | null) {
    form.setValue('scheduledStartDate', date)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    form.handleSubmit(() => {
      const payload = buildStrategyPayload({
        initial, type, ticker, cycleSeedType, seedUsd, canEditSeed, isVr,
        usesDivisionCount, divisionCount, divisionCountSettings, runtimeStrategy,
        vrFields, vrDerived, scheduledStartDate,
      })

      if (initial) {
        updateMutation.mutate(payload)
      } else {
        createMutation.mutate(payload)
      }
    }, () => {
      setResolverValidationReason('입력값을 다시 확인해 주세요.')
    })(e)
  }

  return {
    type, setType, usesDivisionCount, requiresPrivacyBase, canEditSeed, seedUnavailableReason,
    ticker, availableTickers, handleTickerChange, basePrice, prices,
    pct, setPct, seedUsdInput, setSeedUsdInput, usdDeposit, minSeed, isBelowMinSeed, loadingBase,
    balanceCheckEnabled,
    isMock,
    autoStart, setAutoStart, seedMode, setSeedMode,
    divisionCount, setDivisionCount, divisionCountSettings, tickerCustomizable,
    enabledStrategyTypes, runtimeConfigUnavailable,
    runtimeConfigError: runtimeQuery.isError,
    retryRuntimeConfig: () => { void runtimeQuery.refetch() },
    isVr, vrFields, setVrField, recurringMode, setRecurringMode,
    vrRampDefaults: {
      initialGradient: vrDerived.effectiveInitialGradient,
      gMax: vrDerived.effectiveGMax,
      initialPoolLimitRate: vrDerived.effectiveInitialPoolLimitRate,
      poolLimitFloor: vrDerived.effectivePoolLimitFloor,
    },
    vrSettings,
    scheduledStartDate, setScheduledStartDate,
    loading: createMutation.isPending || updateMutation.isPending,
    initializing: (!initialized && loadingBase) || (!initial && runtimeQuery.isLoading),
    cannotSubmit,
    submitDisabledReason,
    handleSubmit,
  }
}
