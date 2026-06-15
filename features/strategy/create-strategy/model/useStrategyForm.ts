'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useMeta } from '@entities/meta'
import { useAccountMarginQuery, useAccountPricesQuery } from '@entities/account'
import { usePrivacyCurrentBaseQuery } from '@entities/privacy'
import { useCreateStrategyMutation, useUpdateStrategyMutation, calcMinSeed } from '@entities/strategy'
import type { CycleSeedType, Strategy, StrategyRequest } from '@entities/strategy'
import type { PriceMap } from '@entities/account'
import { useMeQuery } from '@entities/user'
import { useSeedModel } from './useSeedModel'

interface UseStrategyFormOptions {
  accountId: string
  initial?: Strategy
  onSuccess?: () => void
}

export interface UseStrategyFormReturn {
  type: string
  setType: (t: string) => void
  isInfinite: boolean

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
  privacyBase: number | null
  balanceCheckEnabled: boolean

  autoStart: boolean
  setAutoStart: (v: boolean) => void
  seedMode: 'KEEP' | 'MAX'
  setSeedMode: (m: 'KEEP' | 'MAX') => void

  divisionCount: number
  setDivisionCount: (n: number) => void

  loading: boolean
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

  const [type, setType] = useState<string>(initial?.type ?? meta.strategyTypes[0]?.code ?? '')
  const [ticker, setTicker] = useState<string>(initial?.ticker ?? '')
  const [autoStart, setAutoStart] = useState(initial ? initial.cycleSeedType !== 'NONE' : true)
  const [seedMode, setSeedMode] = useState<'KEEP' | 'MAX'>(
    initial?.cycleSeedType === 'MAINTAIN' ? 'KEEP' : 'MAX',
  )
  const [divisionCount, setDivisionCount] = useState<number>(initial?.divisionCount ?? 20)

  const { data: meData } = useMeQuery()
  const balanceCheckEnabled = meData?.balanceCheckEnabled ?? true
  const { items: marginItems, isLoading: marginLoading } = useAccountMarginQuery(accountId)
  const allTickerCodes = useMemo(() => meta.tickers.map((t) => t.code), [meta.tickers])
  const { data: pricesData, isLoading: pricesLoading } = useAccountPricesQuery(accountId, allTickerCodes)
  const { data: privacyData, isLoading: privacyLoading } = usePrivacyCurrentBaseQuery()

  const prices = pricesData ?? null
  const usdDeposit = marginItems.find((m) => m.currency === 'USD')?.purchasableAmount ?? null
  const privacyBase = privacyData?.currentCycleStart ?? null
  const loadingBase = marginLoading || pricesLoading || privacyLoading

  useEffect(() => {
    if (loadingBase) return
    if (usdDeposit === null && prices === null && privacyBase === null) {
      toast.error('예수금 / 현재가 조회에 실패했습니다')
    }
  }, [loadingBase]) // eslint-disable-line react-hooks/exhaustive-deps

  const typeMeta = useMemo(() => findStrategyType(type), [findStrategyType, type])
  const availableTickers = typeMeta?.availableTickers ?? []
  const isInfinite = (typeMeta?.availableTickers?.length ?? 0) > 1

  const basePrice = useMemo(() => {
    if (!type || !ticker) return null
    if (isInfinite) return prices?.[ticker] ?? null
    return privacyBase
  }, [type, ticker, isInfinite, prices, privacyBase])

  const minSeed = useMemo(
    () => calcMinSeed(basePrice, isInfinite, divisionCount),
    [isInfinite, basePrice, divisionCount],
  )

  const {
    pct, setPct,
    seedUsdInput, setSeedUsdInput,
    resetSeed,
    seedUsd, isDirty,
    isBelowMinSeed, isInvalidSeed,
  } = useSeedModel({ balanceCheckEnabled, initial, usdDeposit, minSeed })

  // type 변경 시 ticker 기본값 + 시드 초기화
  useEffect(() => {
    if (initial) return
    if (!typeMeta) return
    const newTicker =
      !ticker || !availableTickers.includes(ticker)
        ? (typeMeta.availableTickers[0] ?? '')
        : ticker
    if (!ticker || !availableTickers.includes(ticker)) {
      setTicker(newTicker)
    }
    const newIsInfinite = (typeMeta.availableTickers?.length ?? 0) > 1
    const newBasePrice = newIsInfinite ? (prices?.[newTicker] ?? null) : privacyBase
    const newMinSeed = calcMinSeed(newBasePrice, newIsInfinite, divisionCount)
    resetSeed({
      pct: usdDeposit !== null && newMinSeed !== null && usdDeposit < newMinSeed ? 0 : 100,
      seedUsdInput: newMinSeed !== null ? Math.round(newMinSeed) : null,
    })
  }, [type]) // eslint-disable-line react-hooks/exhaustive-deps

  const cannotSubmit = isBelowMinSeed || isInvalidSeed || basePrice === null

  const cycleSeedType: CycleSeedType = !autoStart
    ? 'NONE'
    : seedMode === 'KEEP'
      ? 'MAINTAIN'
      : 'MAX'

  function handleTickerChange(code: string) {
    setTicker(code)
    const newBasePrice = prices?.[code] ?? null
    const newMinSeed = calcMinSeed(newBasePrice, true, divisionCount)
    resetSeed({
      pct: usdDeposit !== null && newMinSeed !== null && usdDeposit < newMinSeed ? 0 : 100,
      seedUsdInput: newMinSeed !== null ? Math.round(newMinSeed) : null,
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!type) { toast.error('전략 타입을 선택하세요'); return }
    if (!ticker) { toast.error('종목을 선택하세요'); return }

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
          ...(isInfinite ? { divisionCount } : {}),
        }

    if (initial) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  return {
    type, setType, isInfinite,
    ticker, availableTickers, handleTickerChange, basePrice, prices,
    pct, setPct, seedUsdInput, setSeedUsdInput, usdDeposit, minSeed, isBelowMinSeed, loadingBase, privacyBase,
    balanceCheckEnabled,
    autoStart, setAutoStart, seedMode, setSeedMode,
    divisionCount, setDivisionCount,
    loading: createMutation.isPending || updateMutation.isPending,
    cannotSubmit,
    handleSubmit,
  }
}
