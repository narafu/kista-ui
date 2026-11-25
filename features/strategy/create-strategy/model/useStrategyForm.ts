'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { RAMP_DEFAULTS_BY_MODE, useStrategyValidationQuery } from '@entities/strategy'
import type { Strategy, StrategyRequest, StrategyValidation, VrRecurringMode } from '@entities/strategy'
import type { BrokerCode, PriceMap } from '@entities/account'
import type { StrategyFieldSettings } from '@entities/meta'
import { useStrategyFormData } from './useStrategyFormData'
import { isBelowMinSeed as belowMinSeed, useSeedModel } from './useSeedModel'
import { isInvalidBootstrap, isInvalidScheduledStart, isInvalidVr, isRuntimeValueInvalid, computeCannotSubmit, computeSubmitDisabled, computeVrAssets, type SeedCheck, type SubmitDisabled, type SubmitReasonField } from './strategyFormGuards'
import { buildStrategyPayload } from './buildStrategyPayload'
import { buildStrategyFormDefaults, createFormSetters, deriveRuntimeFields, deriveSeedPreview, toCycleSeedType, watchVrFields } from './strategyFormHelpers'
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

// 램프 4필드 미입력("자동")의 실제값 — placeholder에 보이고 그대로 전송된다
export interface VrRampDefaults {
  initialGradient: number
  gMax: number
  initialPoolLimitRate: number
  poolLimitFloor: number
}

// 서버 검증 거절의 요청 필드 → 사유를 붙일 입력칸. 나머지는 폼 하단
const SERVER_FIELD_SLOT: Record<string, SubmitReasonField> = {
  initialHoldings: 'holdings',
  initialAvgPrice: 'holdings',
  scheduledStartDate: 'scheduledStart',
  recurringAmount: 'recurring',
}

// 검증 결과를 유지해도 되는 범위 — 시드 미리보기(최소 시드·기준가)는 유형·종목·분할 수로만 바뀐다
const sameSeedScope = (a: StrategyRequest, b: StrategyRequest) =>
  a.type === b.type && a.ticker === b.ticker && a.divisionCount === b.divisionCount

export interface UseStrategyFormReturn {
  type: string
  setType: (t: string) => void
  usesDivisionCount: boolean
  requiresPrivacyBase: boolean
  canEditSeed: boolean
  seedUnavailableReason: string | null

  ticker: string
  availableTickers: string[]
  defaultTicker: string
  handleTickerChange: (code: string) => void
  basePrice: number | null
  prices: PriceMap | null

  seedUsdInput: number | null
  setSeedUsdInput: (v: number | null) => void
  availableCash: number | null // 시드 미리보기의 가용 예수금 — 참고값·비율 채우기용 (모의계좌·조회 실패는 null)
  minSeed: number | null
  isBelowMinSeed: boolean
  loadingBase: boolean
  isMock: boolean

  autoStart: boolean
  setAutoStart: (v: boolean) => void
  seedMode: 'KEEP' | 'MAX'
  setSeedMode: (m: 'KEEP' | 'MAX') => void

  divisionCount: DivisionCount
  setDivisionCount: (n: DivisionCount) => void
  divisionCountSettings?: StrategyFieldSettings<number>
  tickerCustomizable: boolean
  enabledStrategyTypes: string[]
  brokerRestrictionNotes: string[]
  runtimeConfigUnavailable: boolean

  // VR 전략 전용
  isVr: boolean
  vrFields: VrFields
  setVrField: (field: keyof VrFields, value: number | null) => void
  recurringMode: VrRecurringMode
  setRecurringMode: (mode: VrRecurringMode) => void
  // 램프 파라미터 미입력 시 서버로 전송될 실제값 — "자동" 플레이스홀더에 표시
  vrRampDefaults: VrRampDefaults
  vrSettings: {
    recurringMode?: StrategyFieldSettings<string>
    bandWidth?: StrategyFieldSettings<number>
    intervalWeeks?: StrategyFieldSettings<number>
  }

  // 시작예정일 — 세 전략 공통, 등록 전용
  scheduledStartDate: string | null
  setScheduledStartDate: (date: string | null) => void

  loading: boolean
  initializing: boolean
  cannotSubmit: boolean
  submitDisabledReason: string | null
  submitDisabledField: SubmitReasonField | null
  // PRIVACY 최소 시드 확인용 검증이 실패했을 때 다시 부른다
  seedCheck: SeedCheck
  retryValidation: () => void
  // 서버 검증 경고(저장은 된다) — 지금 입력의 결과만
  warnings: StrategyValidation['warnings']
  // 제출했으면 true, 막혔으면 false(호출부가 사유로 포커스를 옮긴다)
  handleSubmit: (e: React.FormEvent) => boolean
}

export function useStrategyForm({
  accountId,
  broker,
  initial,
  onSuccess,
}: UseStrategyFormOptions): UseStrategyFormReturn {
  const queryClient = useQueryClient()
  const {
    isMock, meta, findStrategyType, enabledStrategyTypes, brokerRestrictionNotes,
    prices, pricesError,
  } = useStrategyFormData(accountId, broker)
  // 유형별 운영 설정(enabled·fields) — 메타가 SSOT
  const settingsOf = (code: string) => meta.strategyTypes.find((t) => t.code === code)
  const defaultType = enabledStrategyTypes[0] ?? ''

  const { submit, loading } = useStrategyMutations({ queryClient, accountId, initial, onSuccess })

  // react-hook-form — type/ticker/autoStart/seedMode/divisionCount + VR 필드 관리
  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(strategyFormSchema),
    defaultValues: buildStrategyFormDefaults(initial, defaultType, settingsOf(defaultType)),
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
    avgPrice, quantity, intervalWeeks, bandWidth,
  } = vrFields
  const recurringMode = form.watch('recurringMode')
  const scheduledStartDate = form.watch('scheduledStartDate') ?? null
  const isVr = type === 'VR'

  const typeMeta = useMemo(() => findStrategyType(type), [findStrategyType, type])
  const runtimeStrategy = settingsOf(type)
  const {
    availableTickers, defaultTicker, divisionCountSettings, usesDivisionCount, tickerCustomizable, vrSettings,
  } = deriveRuntimeFields(
    initial, runtimeStrategy,
    (code) => meta.tickers.some((t) => t.code === code),
    (typeMeta?.divisionCounts.length ?? 0) > 0,
  )
  const requiresPrivacyBase = typeMeta?.requiresPrivacyBase ?? false
  // 메타가 없으면(구버전 api) 같은 값의 고정표 — 서버 VrRampInput.withDefaults와 같은 표
  const rampDefaults: VrRampDefaults = typeMeta?.vrRampDefaults?.[recurringMode] ?? RAMP_DEFAULTS_BY_MODE[recurringMode]

  // 시드는 검증 바디(=제출 바디)에 들어가므로 검증보다 먼저 둔다
  const {
    seedUsdInput, setSeedUsdInput,
    resetSeed,
    seedUsd,
    isInvalidSeed,
  } = useSeedModel({ initial, avgPrice, quantity })

  const cycleSeedType = toCycleSeedType(isVr, autoStart, seedMode)
  const payload = buildStrategyPayload({
    initial, type, ticker, cycleSeedType, seedUsd, canEditSeed, isVr,
    usesDivisionCount, divisionCount, divisionCountSettings, runtimeStrategy,
    vrFields, recurringMode, rampDefaults, scheduledStartDate,
  })

  // 서버 검증 — 바디는 제출 바디 그대로. DCA는 DcaStrategyForm이 따로 부른다
  const validation = useStrategyValidationQuery(
    initial ? { kind: 'update', strategyId: initial.id } : { kind: 'create', accountId },
    payload,
    { enabled: !!type && !!ticker && (initial?.type ?? type) !== 'DCA', keepWhile: sameSeedScope },
  )
  const { basePrice, minSeed, seedUnavailableReason, availableCash } = deriveSeedPreview(isVr, validation.data?.derived)
  const isBelowMinSeed = belowMinSeed({ seedUsd, minSeed, avgPrice, quantity })
  const loadingBase = !isVr && validation.isLoading

  const initializing = useInitializing(loadingBase)

  useLoadFailToast(isMock, pricesError)

  // 최소 시드는 지금 입력의 결과로만 시드를 채운다 — 이전 유형·종목의 응답으로 채우지 않게
  useInitialSeedReset({
    initial, isVr, resetSeed,
    minSeed: validation.current ? deriveSeedPreview(isVr, validation.current.derived).minSeed : null,
    scope: `${type}|${ticker}|${divisionCount}`,
  })

  // 서버가 검증하지 않는 PRIVACY 최소 시드·NO_PRIVACY_BASE(등록)는 서버 파생값이 있어야 판정한다. 수정은 서버가 값을 주지 않아 판정하지 않는다(사용자 결정)
  // 서버가 지금 입력을 거절했으면 그 사유가 막는다(거절 응답은 파생값이 비어 있을 수 있다 — 해석 실패·400)
  const seedCheck: SeedCheck = initial || !requiresPrivacyBase || minSeed !== null || seedUnavailableReason !== null
    || (validation.current?.fieldErrors.length ?? 0) > 0
    ? 'ok'
    : validation.isError || validation.data ? 'failed' : 'loading'

  const vrAssets = computeVrAssets({ initial, vrFields, seedUsd, recurringMode })

  const invalidBootstrap = isInvalidBootstrap({ initial, avgPrice, quantity })
  const invalidScheduledStart = isInvalidScheduledStart({ initial, scheduledStartDate })
  const invalidVr = isInvalidVr({ isVr, vrFields, recurringMode, vrAssets, rampDefaults })
  const runtimeValueInvalid = isRuntimeValueInvalid({
    initial, runtimeStrategy, ticker, divisionCountSettings, divisionCount, isVr, bandWidth, intervalWeeks, recurringMode,
  })

  const runtimeConfigUnavailable = !initial && enabledStrategyTypes.length === 0
  const cannotSubmit = computeCannotSubmit({
    initial, canEditSeed, runtimeConfigUnavailable,
    isRuntimeValueInvalid: runtimeValueInvalid,
    isInvalidBootstrap: invalidBootstrap,
    isInvalidScheduledStart: invalidScheduledStart,
    isInvalidVr: invalidVr,
    isBelowMinSeed, isVr, isInvalidSeed, seedCheck,
  })

  const preSubmitDisabled = computeSubmitDisabled({
    initial, canEditSeed, runtimeConfigUnavailable,
    isInvalidScheduledStart: invalidScheduledStart,
    isVr, vrFields, recurringMode, vrAssets, rampDefaults,
    isRuntimeValueInvalid: runtimeValueInvalid,
    seedUnavailableReason, isBelowMinSeed, minSeed, isInvalidSeed, seedCheck,
  })

  // 서버 거절은 로컬 규칙이 모두 통과한 뒤에 보인다(로컬이 즉시·구체적). 지금 입력의 결과만 쓴다 — 검증 중·실패면 막지 않고 제출에서 서버가 다시 거른다
  const serverError = validation.current?.fieldErrors[0]
  const serverDisabled: SubmitDisabled | null = serverError
    // 보유·시작예정일 입력칸은 등록에만 있다 — 수정은 하단에 둔다(안 보이는 칸에 붙여 사유가 사라지지 않게)
    ? { message: serverError.detail, field: initial ? null : SERVER_FIELD_SLOT[serverError.field ?? ''] ?? null }
    : null
  const submitDisabled = preSubmitDisabled ?? serverDisabled

  const submitDisabledReason = submitDisabled?.message ?? resolverValidationReason
  // 특정 입력칸의 사유면 그 칸 아래에 표시한다(하단은 여러 칸에 걸친 사유·resolver 사유만)
  const submitDisabledField = submitDisabled?.field ?? null
  const blocked = cannotSubmit || serverDisabled !== null

  const setters = createFormSetters(form, settingsOf)

  // 제출 버튼은 진행 중·잠금일 때만 비활성 — 막힌 제출은 사유를 남기고 false를 돌려준다
  function handleSubmit(e: React.FormEvent): boolean {
    e.preventDefault()
    if (blocked) {
      // 사유 문장 없이 막는 조합(비VR 허용값 밖 등)도 무엇이 문제인지 남긴다
      if (!submitDisabled) setResolverValidationReason('입력값을 다시 확인하세요.')
      return false
    }
    form.handleSubmit(() => {
      submit(payload)
    }, () => {
      setResolverValidationReason('입력값을 다시 확인하세요.')
    })(e)
    return true
  }

  return {
    ...setters,
    type, usesDivisionCount, requiresPrivacyBase, canEditSeed, seedUnavailableReason,
    ticker, availableTickers, defaultTicker, basePrice, prices,
    seedUsdInput, setSeedUsdInput, availableCash, minSeed, isBelowMinSeed, loadingBase,
    isMock,
    autoStart, seedMode,
    divisionCount, divisionCountSettings, tickerCustomizable,
    enabledStrategyTypes, brokerRestrictionNotes, runtimeConfigUnavailable,
    isVr, vrFields, recurringMode,
    vrRampDefaults: rampDefaults,
    vrSettings,
    scheduledStartDate,
    loading,
    initializing,
    cannotSubmit,
    submitDisabledReason,
    submitDisabledField,
    seedCheck,
    retryValidation: () => { void validation.refetch() },
    warnings: validation.current?.warnings ?? [],
    handleSubmit,
  }
}
