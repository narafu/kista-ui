'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useMeta } from '@entities/meta'
import { useAccountMarginQuery, useAccountPricesQuery } from '@entities/account'
import { usePrivacyCurrentBaseQuery } from '@entities/privacy'
import { useCreateStrategyMutation, useUpdateStrategyMutation, calcMinSeed } from '@entities/strategy'
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

  // UI 상태만 유지
  const [type, setType] = useState<string>(initial?.type ?? meta.strategyTypes[0]?.code ?? '')
  const [ticker, setTicker] = useState<string>(initial?.ticker ?? '')
  const [pct, setPctInternal] = useState(100)
  const [seedTouched, setSeedTouched] = useState(false)
  const pctInitialized = useRef(false)

  // 사용자가 게이지를 직접 조작한 경우에만 시드 변경으로 간주 (수정 시 미조작이면 시드 미전송)
  function setPct(p: number) {
    setSeedTouched(true)
    setPctInternal(p)
  }

  const [autoStart, setAutoStart] = useState(initial ? initial.cycleSeedType !== 'NONE' : true)
  const [seedMode, setSeedMode] = useState<'KEEP' | 'MAX'>(
    initial?.cycleSeedType === 'MAINTAIN' ? 'KEEP' : 'MAX',
  )
  const [divisionCount, setDivisionCount] = useState<number>(initial?.divisionCount ?? 20)

  // 서버 상태는 React Query 훅으로
  const { items: marginItems, isLoading: marginLoading } = useAccountMarginQuery(accountId)
  const allTickerCodes = useMemo(() => meta.tickers.map((t) => t.code), [meta.tickers])
  const { data: pricesData, isLoading: pricesLoading } = useAccountPricesQuery(accountId, allTickerCodes)
  const { data: privacyData, isLoading: privacyLoading } = usePrivacyCurrentBaseQuery()

  const prices = pricesData ?? null
  const usdDeposit = marginItems.find((m) => m.currency === 'USD')?.purchasableAmount ?? null
  const privacyBase = privacyData?.currentCycleStart ?? null
  const loadingBase = marginLoading || pricesLoading || privacyLoading

  // 서버 데이터 로드 실패 토스트
  useEffect(() => {
    if (loadingBase) return
    if (usdDeposit === null && prices === null && privacyBase === null) {
      toast.error('예수금 / 현재가 조회에 실패했습니다')
    }
  }, [loadingBase]) // eslint-disable-line react-hooks/exhaustive-deps

  // 수정 모드: 예수금 로드 후 현재 시드 비율로 게이지 1회 초기화
  useEffect(() => {
    if (!initial || pctInitialized.current) return
    if (usdDeposit === null || usdDeposit === 0) return
    if (initial.initialUsdDeposit == null) return
    const ratio = Math.round((initial.initialUsdDeposit / usdDeposit) * 100)
    setPctInternal(Math.min(100, Math.max(0, ratio)))
    pctInitialized.current = true
  }, [initial, usdDeposit])

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
    const newMinSeed = calcMinSeed(newBasePrice, newIsInfinite, divisionCount)
    setPctInternal(
      usdDeposit !== null && newMinSeed !== null && usdDeposit < newMinSeed ? 0 : 100,
    )
  }, [type]) // eslint-disable-line react-hooks/exhaustive-deps

  const basePrice = useMemo(() => {
    if (!type || !ticker) return null
    if (isInfinite) return prices?.[ticker] ?? null
    return privacyBase
  }, [type, ticker, isInfinite, prices, privacyBase])

  const minSeed = useMemo(
    () => calcMinSeed(basePrice, isInfinite, divisionCount),
    [isInfinite, basePrice, divisionCount],
  )

  const seedUsd = usdDeposit !== null ? Math.round(usdDeposit * pct) / 100 : null
  const isBelowMinSeed = seedUsd !== null && minSeed !== null && seedUsd < minSeed
  const cannotSubmit = isBelowMinSeed || basePrice === null

  const cycleSeedType: CycleSeedType = !autoStart
    ? 'NONE'
    : seedMode === 'KEEP'
      ? 'MAINTAIN'
      : 'MAX'

  function handleTickerChange(code: string) {
    setTicker(code)
    const newBasePrice = prices?.[code] ?? null
    const newMinSeed = calcMinSeed(newBasePrice, true, divisionCount)
    setPctInternal(
      usdDeposit !== null && newMinSeed !== null && usdDeposit < newMinSeed ? 0 : 100,
    )
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
          ...(seedTouched && seedUsd != null ? { initialUsdDeposit: seedUsd } : {}),
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
    pct, setPct, usdDeposit, minSeed, isBelowMinSeed, loadingBase, privacyBase,
    autoStart, setAutoStart, seedMode, setSeedMode,
    divisionCount, setDivisionCount,
    loading: createMutation.isPending || updateMutation.isPending,
    cannotSubmit,
    handleSubmit,
  }
}
