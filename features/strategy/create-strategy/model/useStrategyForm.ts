'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { fmtUsd } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import { useAccountMarginQuery, useAccountPricesQuery } from '@entities/account'
import { useCreateStrategyMutation, useUpdateStrategyMutation, useStrategySeedPreviewQuery } from '@entities/strategy'
import type { CycleSeedType, Strategy, StrategyRequest } from '@entities/strategy'
import type { PriceMap } from '@entities/account'
import { useMeQuery } from '@entities/user'
import { useSeedModel } from './useSeedModel'
import { strategyFormSchema, type DivisionCount, type StrategyFormValues } from './strategyFormSchema'

interface UseStrategyFormOptions {
  accountId: string
  initial?: Strategy
  onSuccess?: () => void
}

// VR 전략 전용 폼 필드
export interface VrFields {
  initialValue: number | null
  intervalWeeks: number | null
  bandWidth: number | null
  recurringAmount: number | null
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

  autoStart: boolean
  setAutoStart: (v: boolean) => void
  seedMode: 'KEEP' | 'MAX'
  setSeedMode: (m: 'KEEP' | 'MAX') => void

  divisionCount: DivisionCount
  setDivisionCount: (n: DivisionCount) => void

  // VR 전략 전용
  isVr: boolean
  vrFields: VrFields
  setVrField: (field: keyof VrFields, value: number | null) => void

  loading: boolean
  initializing: boolean
  cannotSubmit: boolean
  submitDisabledReason: string | null
  handleSubmit: (e: React.FormEvent) => void
}

export function useStrategyForm({
  accountId,
  initial,
  onSuccess,
}: UseStrategyFormOptions): UseStrategyFormReturn {
  const { meta, findStrategyType } = useMeta()

  const createMutation = useCreateStrategyMutation(accountId, onSuccess)
  const updateMutation = useUpdateStrategyMutation(initial?.id ?? '', onSuccess)
  const initialDivisionCount: DivisionCount =
    initial?.divisionCount === 30 || initial?.divisionCount === 40 ? initial.divisionCount : 20

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
      // VR 초기값 — 기존 전략이면 vr 요약에서 복원
      initialValue: initial?.vr?.value ?? 0,
      intervalWeeks: initial?.vr?.intervalWeeks ?? 2,
      bandWidth: initial?.vr?.bandWidth ?? 15,
      recurringAmount: initial?.vr?.recurringAmount ?? 0,
    },
  })

  const type = form.watch('type')
  const ticker = form.watch('ticker')
  const autoStart = form.watch('autoStart')
  const seedMode = form.watch('seedMode')
  const divisionCount = form.watch('divisionCount')
  const canEditSeed = !!initial && (initial.currentHoldings ?? 0) === 0

  // VR 필드 watch
  const initialValue = form.watch('initialValue') ?? null
  const intervalWeeks = form.watch('intervalWeeks') ?? null
  const bandWidth = form.watch('bandWidth') ?? null
  const recurringAmount = form.watch('recurringAmount') ?? null
  const isVr = type === 'VR'
  const vrFields: VrFields = { initialValue, intervalWeeks, bandWidth, recurringAmount }

  // capability 파생 — isInfinite 휴리스틱 대신 백엔드 SSOT 사용
  const typeMeta = useMemo(() => findStrategyType(type), [findStrategyType, type])
  const availableTickers = typeMeta?.availableTickers ?? []
  const usesDivisionCount = (typeMeta?.divisionCounts?.length ?? 0) > 0
  const requiresPrivacyBase = typeMeta?.requiresPrivacyBase ?? false

  const { data: meData } = useMeQuery()
  const balanceCheckEnabled = meData?.balanceCheckEnabled ?? true

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
    if (!typeMeta) return
    if (!ticker || !availableTickers.includes(ticker)) {
      // eslint-disable-next-line react-doctor/no-event-handler
      form.setValue('ticker', typeMeta.availableTickers[0] ?? '')
    }
  }, [type]) // eslint-disable-line react-doctor/exhaustive-deps

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

  const normalizedInitialValue = initialValue ?? 0
  const normalizedInitialSeed = seedUsd ?? 0
  const normalizedRecurringAmount = recurringAmount ?? 0
  const initialAssets = normalizedInitialValue + normalizedInitialSeed
  const requiredWithdrawalAssets = intervalWeeks !== null && intervalWeeks > 0
    ? Math.abs(normalizedRecurringAmount) * 100 * (4 / intervalWeeks)
    : 0

  // VR 필수 필드 유효성 검사 — API 등록 정책과 동일하게 초기 V/시드는 0을 허용하되 모드별 자산 조건을 적용
  const isInvalidVr = isVr && (
    normalizedInitialValue < 0 ||
    intervalWeeks === null ||
    intervalWeeks < 1 ||
    !Number.isInteger(intervalWeeks) ||
    bandWidth === null ||
    bandWidth <= 0 ||
    (recurringAmount !== null && !Number.isInteger(recurringAmount)) ||
    (normalizedRecurringAmount <= 0 && initialAssets <= 0) ||
    (normalizedRecurringAmount < 0 && initialAssets < requiredWithdrawalAssets)
  )

  const cannotSubmit = initial && !canEditSeed
    ? false
    : isInvalidVr || isBelowMinSeed || (!isVr && isInvalidSeed) || (!isVr && basePrice === null && seedUnavailableReason === null)

  const submitDisabledReason = initial && !canEditSeed
    ? null
    : isVr
      ? (() => {
          if (normalizedInitialValue < 0) return '초기 V값은 0 이상이어야 합니다.'
          if (intervalWeeks === null || intervalWeeks < 1 || !Number.isInteger(intervalWeeks)) {
            return '리밸런싱 주기는 1 이상 정수여야 합니다.'
          }
          if (bandWidth === null || bandWidth <= 0) return '밴드 폭은 0보다 커야 합니다.'
          if (recurringAmount !== null && !Number.isInteger(recurringAmount)) {
            return '적립금(+)/인출금(-)은 정수여야 합니다.'
          }
          if (normalizedRecurringAmount <= 0 && initialAssets <= 0) {
            return '거치식/인출식은 초기 V값 또는 초기 시드가 0보다 커야 합니다.'
          }
          if (normalizedRecurringAmount < 0 && initialAssets < requiredWithdrawalAssets) {
            return `인출식은 초기 자산이 $${fmtUsd(requiredWithdrawalAssets)} 이상이어야 합니다.`
          }
          return null
        })()
      : (() => {
          if (seedUnavailableReason === 'NO_PRIVACY_BASE') return '기준 매매표가 없어 등록할 수 없습니다.'
          if (isBelowMinSeed && minSeed !== null) return `최소 시드 $${fmtUsd(minSeed)} 이상이 필요합니다.`
          if (isInvalidSeed) return '시드 금액은 0보다 커야 합니다.'
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
    form.setValue(field, value)
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
            ticker,
            cycleSeedType,
            initialUsdDeposit: isVr ? normalizedInitialSeed : seedUsd ?? undefined,
            ...(usesDivisionCount ? { divisionCount } : {}),
            // VR 전용 필드 — null이면 0으로 기본값 처리
            ...(isVr ? {
              initialValue: normalizedInitialValue,
              intervalWeeks: intervalWeeks ?? undefined,
              bandWidth: bandWidth ?? undefined,
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
    autoStart, setAutoStart, seedMode, setSeedMode,
    divisionCount, setDivisionCount,
    isVr, vrFields, setVrField,
    loading: createMutation.isPending || updateMutation.isPending,
    initializing: !initialized && loadingBase,
    cannotSubmit,
    submitDisabledReason,
    handleSubmit,
  }
}
