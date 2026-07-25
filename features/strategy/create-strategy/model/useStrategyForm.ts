'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { fmtUsd, todayKst } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import { useAccountMarginQuery, useAccountPricesQuery } from '@entities/account'
import { useCreateStrategyMutation, useUpdateStrategyMutation, useStrategySeedPreviewQuery } from '@entities/strategy'
import type { CycleSeedType, Strategy, StrategyRequest } from '@entities/strategy'
import type { BrokerCode, PriceMap } from '@entities/account'
import { useMeQuery } from '@entities/user'
import { useRuntimeConfigQuery } from '@entities/runtime-config'
import type { RuntimeFieldSettings, RuntimeStrategyType } from '@entities/runtime-config'
import { useSeedModel } from './useSeedModel'
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
}
type VrRecurringMode = 'DEPOSIT' | 'HOLD' | 'WITHDRAW'

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
  const isMock = broker === 'MOCK'
  const { meta, findStrategyType } = useMeta()
  const runtimeQuery = useRuntimeConfigQuery()
  const runtimeConfig = runtimeQuery.data
  const enabledStrategyTypes = meta.strategyTypes
    .filter(({ code }) => runtimeConfig?.strategies[code as RuntimeStrategyType]?.enabled === true)
    .map(({ code }) => code)

  const createMutation = useCreateStrategyMutation(accountId, onSuccess)
  const updateMutation = useUpdateStrategyMutation(initial?.id ?? '', onSuccess)
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
      // 시작예정일도 등록 전용 — 수정 모드에서는 항상 빈 값
      scheduledStartDate: null,
    },
  })

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
  const scheduledStartDate = form.watch('scheduledStartDate') ?? null
  const isVr = type === 'VR'
  const vrFields: VrFields = { avgPrice, quantity, intervalWeeks, bandWidth, recurringAmount }

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
  const defaultsAppliedForTypeRef = useRef<string | null>(null)
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
  } = useSeedModel({ balanceCheckEnabled, initial, editableEdit: canEditSeed, usdDeposit, minSeed })

  // type 변경 시 ticker 기본값 설정 — 시드는 minSeed effect에서 처리
  useEffect(() => {
    if (initial) return
    if (!runtimeConfig) return
    if (!enabledStrategyTypes.includes(type)) {
      form.setValue('type', enabledStrategyTypes[0] ?? '')
      return
    }
    if (defaultsAppliedForTypeRef.current === type) return
    defaultsAppliedForTypeRef.current = type
    if (!ticker || !availableTickers.includes(ticker)) {
      form.setValue('ticker', runtimeStrategy?.fields.ticker.defaultValue ?? '')
    }
    if (divisionCountSettings) form.setValue('divisionCount', divisionCountSettings.defaultValue)
    if (runtimeStrategy?.fields.bandWidth) form.setValue('bandWidth', runtimeStrategy.fields.bandWidth.defaultValue)
    if (runtimeStrategy?.fields.intervalWeeks) form.setValue('intervalWeeks', runtimeStrategy.fields.intervalWeeks.defaultValue)
    if (runtimeStrategy?.fields.recurringMode) {
      form.setValue('recurringMode', runtimeStrategy.fields.recurringMode.defaultValue)
      form.setValue('recurringAmount', 0)
    }
  }, [type, runtimeConfig]) // eslint-disable-line react-doctor/exhaustive-deps

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

  // VR 인출식 사전검증용 추정 V값 — 서버는 등록 시점 전일종가×보유수량으로 V를 재계산하므로 이 값은 근사치다
  // (평단가 기준 추정. 실제 등록가는 시장가 기준이라 서버 계산과 다를 수 있음 — 최종 검증은 서버가 수행)
  const normalizedInitialValue = initial
    ? initial.vr?.value ?? 0
    : (avgPrice ?? 0) * (quantity ?? 0)
  const normalizedInitialSeed = seedUsd ?? 0
  const recurringMagnitude = Math.abs(recurringAmount ?? 0)
  const normalizedRecurringAmount = recurringMode === 'HOLD'
    ? 0
    : recurringMode === 'WITHDRAW'
      ? -recurringMagnitude
      : recurringMagnitude
  const selectedRecurringMode = recurringMode
  const initialAssets = normalizedInitialValue + normalizedInitialSeed
  const requiredWithdrawalAssets = intervalWeeks !== null && intervalWeeks > 0
    ? Math.abs(normalizedRecurringAmount) * 100 * (4 / intervalWeeks)
    : 0

  // 중간부터 시작 공통 검증 (세 전략 공통, 등록 전용) — 서버 validateBootstrapPosition과 동일 규칙:
  // 평단가·수량 음수 거부, 보유 수량>0이면 평단가>0 필수. 수량은 서버 initialHoldings가 Integer라 정수만 허용
  const isInvalidBootstrap = !initial && (
    (avgPrice !== null && avgPrice < 0) ||
    (quantity !== null && quantity < 0) ||
    (quantity !== null && !Number.isInteger(quantity)) ||
    (quantity !== null && quantity > 0 && (avgPrice === null || avgPrice <= 0))
  )

  // 시작예정일 검증 (등록 전용) — 서버는 오늘 이전 날짜를 400으로 거부. 오늘 자신은 허용
  const isInvalidScheduledStart = !initial && scheduledStartDate !== null && scheduledStartDate < todayKst()

  // VR 필수 필드 유효성 검사 — API 등록 정책과 동일하게 초기 V/시드는 0을 허용하되 모드별 자산 조건을 적용
  const isInvalidVr = isVr && (
    intervalWeeks === null ||
    intervalWeeks < 1 ||
    !Number.isInteger(intervalWeeks) ||
    bandWidth === null ||
    bandWidth <= 0 ||
    (recurringAmount !== null && !Number.isInteger(recurringAmount)) ||
    (recurringMode !== 'HOLD' && recurringMagnitude <= 0) ||
    (normalizedRecurringAmount <= 0 && initialAssets <= 0) ||
    (normalizedRecurringAmount < 0 && initialAssets < requiredWithdrawalAssets)
  )

  const isRuntimeValueInvalid = !initial && !!runtimeStrategy && (
    !runtimeStrategy.fields.ticker.allowedValues.includes(ticker) ||
    (!!divisionCountSettings && !divisionCountSettings.allowedValues.includes(divisionCount)) ||
    (isVr && !!runtimeStrategy.fields.bandWidth && bandWidth !== null &&
      !runtimeStrategy.fields.bandWidth.allowedValues.includes(bandWidth)) ||
    (isVr && !!runtimeStrategy.fields.intervalWeeks && intervalWeeks !== null &&
      !runtimeStrategy.fields.intervalWeeks.allowedValues.includes(intervalWeeks)) ||
    (isVr && !!runtimeStrategy.fields.recurringMode && (
      !runtimeStrategy.fields.recurringMode.allowedValues.includes(selectedRecurringMode) ||
      (!runtimeStrategy.fields.recurringMode.customizable &&
        runtimeStrategy.fields.recurringMode.defaultValue !== selectedRecurringMode)
    ))
  )

  const runtimeConfigUnavailable = !initial && (!runtimeConfig || enabledStrategyTypes.length === 0)
  const cannotSubmit = initial && !canEditSeed
    ? false
    : runtimeConfigUnavailable || isRuntimeValueInvalid || isInvalidBootstrap || isInvalidScheduledStart || isInvalidVr || isBelowMinSeed || (!isVr && isInvalidSeed) || (!isVr && basePrice === null && seedUnavailableReason === null)

  const submitDisabledReason = initial && !canEditSeed
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
            return '거치식/인출식은 초기 V값 또는 초기 시드가 0보다 커야 합니다.'
          }
          if (normalizedRecurringAmount < 0 && initialAssets < requiredWithdrawalAssets) {
            return `인출식은 초기 자산이 $${fmtUsd(requiredWithdrawalAssets)} 이상이어야 합니다.`
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

  function setType(t: string) {
    form.setValue('type', t)
    const settings = runtimeConfig?.strategies[t as RuntimeStrategyType]
    if (!settings) return
    defaultsAppliedForTypeRef.current = t
    form.setValue('ticker', settings.fields.ticker.defaultValue)
    if (settings.fields.divisionCount) form.setValue('divisionCount', settings.fields.divisionCount.defaultValue)
    if (settings.fields.bandWidth) form.setValue('bandWidth', settings.fields.bandWidth.defaultValue)
    if (settings.fields.intervalWeeks) form.setValue('intervalWeeks', settings.fields.intervalWeeks.defaultValue)
    if (settings.fields.recurringMode) {
      form.setValue('recurringMode', settings.fields.recurringMode.defaultValue)
      form.setValue('recurringAmount', 0)
    }
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
      const payload: StrategyRequest = initial
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
            } : {}),
          }

      if (initial) {
        updateMutation.mutate(payload)
      } else {
        createMutation.mutate(payload)
      }
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
    isVr, vrFields, setVrField, recurringMode, setRecurringMode, vrSettings,
    scheduledStartDate, setScheduledStartDate,
    loading: createMutation.isPending || updateMutation.isPending,
    initializing: (!initialized && loadingBase) || (!initial && runtimeQuery.isLoading),
    cannotSubmit,
    submitDisabledReason,
    handleSubmit,
  }
}
