'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useMeta } from '@entities/meta'
import { useAccountMarginQuery, useAccountPricesQuery } from '@entities/account'
import { useCreateStrategyMutation, useUpdateStrategyMutation, useStrategySeedPreviewQuery } from '@entities/strategy'
import type { CycleSeedType, Strategy, StrategyRequest } from '@entities/strategy'
import type { PriceMap } from '@entities/account'
import { useMeQuery } from '@entities/user'
import { useSeedModel } from './useSeedModel'
import { strategyFormSchema, type StrategyFormValues } from './strategyFormSchema'

interface UseStrategyFormOptions {
  accountId: string
  initial?: Strategy
  onSuccess?: () => void
}

export interface UseStrategyFormReturn {
  type: string
  setType: (t: string) => void
  usesDivisionCount: boolean
  requiresPrivacyBase: boolean
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

  divisionCount: number
  setDivisionCount: (n: number) => void

  loading: boolean
  initializing: boolean
  cannotSubmit: boolean
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

  // react-hook-form — type/ticker/autoStart/seedMode/divisionCount 관리
  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(strategyFormSchema),
    defaultValues: {
      type: initial?.type ?? meta.strategyTypes[0]?.code ?? '',
      ticker: initial?.ticker ?? '',
      autoStart: initial ? initial.cycleSeedType !== 'NONE' : true,
      seedMode: initial?.cycleSeedType === 'MAINTAIN' ? 'KEEP' : 'MAX',
      divisionCount: initial?.divisionCount ?? 20,
    },
  })

  const type = form.watch('type')
  const ticker = form.watch('ticker')
  const autoStart = form.watch('autoStart')
  const seedMode = form.watch('seedMode')
  const divisionCount = form.watch('divisionCount')

  // capability 파생 — isInfinite 휴리스틱 대신 백엔드 SSOT 사용
  const typeMeta = useMemo(() => findStrategyType(type), [findStrategyType, type])
  const availableTickers = typeMeta?.availableTickers ?? []
  const usesDivisionCount = (typeMeta?.divisionCounts?.length ?? 0) > 0
  const requiresPrivacyBase = typeMeta?.requiresPrivacyBase ?? false

  const { data: meData } = useMeQuery()
  const balanceCheckEnabled = meData?.balanceCheckEnabled ?? true

  // 잔고검증 OFF면 예수금 불필요 → margin 쿼리 skip
  const { items: marginItems, isLoading: marginLoading } = useAccountMarginQuery(accountId, {
    enabled: balanceCheckEnabled,
  })

  // 티커 선택 버튼의 가격 표시용 — 여러 ticker 동시 (basePrice 계산엔 미사용)
  const allTickerCodes = useMemo(() => meta.tickers.map((t) => t.code), [meta.tickers])
  const { data: pricesData } = useAccountPricesQuery(accountId, allTickerCodes)
  const prices = pricesData ?? null

  // basePrice/minSeed는 백엔드 계산 — type/ticker/divisionCount 확정 시 조회
  const seedPreview = useStrategySeedPreviewQuery(
    accountId,
    { type, ticker, divisionCount },
    { enabled: !!type && !!ticker },
  )
  const basePrice = seedPreview.data?.basePrice ?? null
  const minSeed = seedPreview.data?.minSeed ?? null
  const seedUnavailableReason = seedPreview.data?.skipReason ?? null
  const loadingBase = seedPreview.isLoading || marginLoading

  const usdDeposit = marginItems.find((m) => m.currency === 'USD')?.purchasableAmount ?? null

  // 초기 로딩 완료 후엔 true로 고정 — 타입 전환 시 재스켈레톤 방지
  const initRef = useRef(false)
  if (!loadingBase) initRef.current = true
  const initialized = initRef.current

  useEffect(() => {
    if (loadingBase) return
    if (usdDeposit === null && prices === null) {
      toast.error('예수금 / 현재가 조회에 실패했습니다')
    }
  }, [loadingBase]) // eslint-disable-line react-doctor/exhaustive-deps

  const {
    pct, setPct,
    seedUsdInput, setSeedUsdInput,
    resetSeed,
    seedUsd, isDirty,
    isBelowMinSeed, isInvalidSeed,
  } = useSeedModel({ balanceCheckEnabled, initial, usdDeposit, minSeed })

  // type 변경 시 ticker 기본값 설정 — 시드는 minSeed effect에서 처리
  useEffect(() => {
    if (initial) return
    if (!typeMeta) return
    if (!ticker || !availableTickers.includes(ticker)) {
      form.setValue('ticker', typeMeta.availableTickers[0] ?? '')
    }
  }, [type]) // eslint-disable-line react-doctor/exhaustive-deps

  // 엔드포인트 minSeed 도착/변경 시 시드 게이지 재초기화 (신규 등록 한정)
  useEffect(() => {
    if (initial) return
    if (minSeed === null) return
    resetSeed({
      pct: usdDeposit !== null && usdDeposit < minSeed ? 0 : 100,
      seedUsdInput: Math.ceil(minSeed),
    })
  }, [minSeed]) // eslint-disable-line react-doctor/exhaustive-deps

  const cannotSubmit = isBelowMinSeed || isInvalidSeed || (basePrice === null && seedUnavailableReason === null)

  const cycleSeedType: CycleSeedType = !autoStart
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

  function setDivisionCount(n: number) {
    form.setValue('divisionCount', n)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    form.handleSubmit(() => {
      const payload: StrategyRequest = initial
        ? {
            type: initial.type,
            ticker: initial.ticker,
            cycleSeedType,
            ...(isDirty && seedUsd != null ? { initialUsdDeposit: seedUsd } : {}),
          }
        : {
            type,
            ticker,
            cycleSeedType,
            initialUsdDeposit: seedUsd ?? undefined,
            ...(usesDivisionCount ? { divisionCount } : {}),
          }

      if (initial) {
        updateMutation.mutate(payload)
      } else {
        createMutation.mutate(payload)
      }
    })(e)
  }

  return {
    type, setType, usesDivisionCount, requiresPrivacyBase, seedUnavailableReason,
    ticker, availableTickers, handleTickerChange, basePrice, prices,
    pct, setPct, seedUsdInput, setSeedUsdInput, usdDeposit, minSeed, isBelowMinSeed, loadingBase,
    balanceCheckEnabled,
    autoStart, setAutoStart, seedMode, setSeedMode,
    divisionCount, setDivisionCount,
    loading: createMutation.isPending || updateMutation.isPending,
    initializing: !initialized && loadingBase,
    cannotSubmit,
    handleSubmit,
  }
}
