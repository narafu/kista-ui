'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useMeta } from '@entities/meta'
import { useAccountMarginQuery, useAccountPricesQuery } from '@entities/account'
import { usePrivacyCurrentBaseQuery } from '@entities/privacy'
import { useCreateStrategyMutation, useUpdateStrategyMutation } from '@entities/strategy'
import type { CycleSeedType, Strategy, StrategyRequest } from '@entities/strategy'
import type { PriceMap } from '@entities/account'

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
  usdDeposit: number | null
  minSeed: number | null
  isBelowMinSeed: boolean
  loadingBase: boolean
  privacyBase: number | null

  autoStart: boolean
  setAutoStart: (v: boolean) => void
  seedMode: 'KEEP' | 'MAX'
  setSeedMode: (m: 'KEEP' | 'MAX') => void

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

  // UI 상태만 유지
  const [type, setType] = useState<string>(initial?.type ?? meta.strategyTypes[0]?.code ?? '')
  const [ticker, setTicker] = useState<string>(initial?.ticker ?? '')
  const [pct, setPct] = useState(100)
  const [autoStart, setAutoStart] = useState(initial ? initial.cycleSeedType !== 'NONE' : true)
  const [seedMode, setSeedMode] = useState<'KEEP' | 'MAX'>(
    initial?.cycleSeedType === 'MAINTAIN' ? 'KEEP' : 'MAX',
  )

  // 서버 상태는 React Query 훅으로
  const { items: marginItems, isLoading: marginLoading } = useAccountMarginQuery(accountId)
  const allTickerCodes = useMemo(() => meta.tickers.map((t) => t.code), [meta.tickers])
  const { data: pricesData, isLoading: pricesLoading } = useAccountPricesQuery(accountId, allTickerCodes)
  const { data: privacyData, isLoading: privacyLoading } = usePrivacyCurrentBaseQuery()

  const prices = pricesData ?? null
  const usdDeposit = marginItems.find((m) => m.currency === 'USD')?.purchasableAmount ?? null
  const privacyBase = privacyData?.currentCycleStart ?? null
  const loadingBase = !initial && (marginLoading || pricesLoading || privacyLoading)

  // 서버 데이터 로드 실패 토스트 (신규 등록 시에만)
  useEffect(() => {
    if (initial || loadingBase) return
    if (usdDeposit === null && prices === null && privacyBase === null) {
      toast.error('예수금 / 현재가 조회에 실패했습니다')
    }
  }, [loadingBase]) // eslint-disable-line react-hooks/exhaustive-deps

  const typeMeta = useMemo(() => findStrategyType(type), [findStrategyType, type])
  const availableTickers = typeMeta?.availableTickers ?? []
  const isInfinite = (typeMeta?.availableTickers?.length ?? 0) > 1

  // type 변경 시 ticker 기본값 + pct 초기화
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
    const newMinSeed = process.env.NEXT_PUBLIC_DEV_BYPASS_MIN_SEED === 'true'
      ? null
      : newIsInfinite
        ? newBasePrice !== null ? newBasePrice * 20 * 2 : null
        : privacyBase !== null ? privacyBase / 2 : null
    setPct(
      usdDeposit !== null && newMinSeed !== null && usdDeposit < newMinSeed ? 0 : 100,
    )
  }, [type]) // eslint-disable-line react-hooks/exhaustive-deps

  const basePrice = useMemo(() => {
    if (!type || !ticker) return null
    if (isInfinite) return prices?.[ticker] ?? null
    return privacyBase
  }, [type, ticker, isInfinite, prices, privacyBase])

  const minSeed = useMemo(() => {
    if (initial) return null
    if (process.env.NEXT_PUBLIC_DEV_BYPASS_MIN_SEED === 'true') return null
    if (isInfinite) return basePrice !== null ? basePrice * 20 * 2 : null
    return privacyBase !== null ? privacyBase / 2 : null
  }, [isInfinite, basePrice, privacyBase, initial])

  const seedUsd = usdDeposit !== null ? Math.round(usdDeposit * pct) / 100 : null
  const isBelowMinSeed = !initial && seedUsd !== null && minSeed !== null && seedUsd < minSeed
  const cannotSubmit = !initial && (isBelowMinSeed || basePrice === null)

  const cycleSeedType: CycleSeedType = !autoStart
    ? 'NONE'
    : seedMode === 'KEEP'
      ? 'MAINTAIN'
      : 'MAX'

  function handleTickerChange(code: string) {
    setTicker(code)
    const newBasePrice = prices?.[code] ?? null
    const newMinSeed = process.env.NEXT_PUBLIC_DEV_BYPASS_MIN_SEED === 'true'
      ? null
      : newBasePrice !== null ? newBasePrice * 20 * 2 : null
    setPct(
      usdDeposit !== null && newMinSeed !== null && usdDeposit < newMinSeed ? 0 : 100,
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!type) { toast.error('전략 타입을 선택하세요'); return }
    if (!ticker) { toast.error('종목을 선택하세요'); return }

    const payload: StrategyRequest = initial
      ? { type: initial.type, ticker: initial.ticker, cycleSeedType }
      : { type, ticker, cycleSeedType, initialUsdDeposit: seedUsd ?? undefined }

    if (initial) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  return {
    type, setType, isInfinite,
    ticker, availableTickers, handleTickerChange, basePrice, prices,
    pct, setPct, usdDeposit, minSeed, isBelowMinSeed, loadingBase, privacyBase,
    autoStart, setAutoStart, seedMode, setSeedMode,
    loading: createMutation.isPending || updateMutation.isPending,
    cannotSubmit,
    handleSubmit,
  }
}
