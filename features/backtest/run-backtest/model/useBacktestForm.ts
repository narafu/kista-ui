'use client'

import { useMemo, useState } from 'react'
import { apiMsg } from '@shared/lib/api-client'
import { useMeta } from '@entities/meta'
import { useBacktestMutation } from '@entities/backtest'
import type { BacktestParams, BacktestType } from '@entities/backtest'

type RecurringMode = 'DEPOSIT' | 'HOLD' | 'WITHDRAW'

export function useBacktestForm() {
  const { meta } = useMeta()
  const mutation = useBacktestMutation()

  const [type, setTypeState] = useState<BacktestType>('INFINITE')
  const [ticker, setTicker] = useState(
    meta.strategyTypes.find((t) => t.code === 'INFINITE')?.availableTickers[0] ?? ''
  )
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [seed, setSeed] = useState<number | null>(null)
  const [avgPrice, setAvgPrice] = useState<number | null>(null)
  const [quantity, setQuantity] = useState<number | null>(null)
  const [divisionCount, setDivisionCount] = useState<number | null>(null)
  const [vrBandWidth, setVrBandWidth] = useState<number | null>(null)
  const [vrIntervalWeeks, setVrIntervalWeeks] = useState<number | null>(null)
  const [vrRecurringMode, setVrRecurringMode] = useState<RecurringMode>('HOLD')
  const [vrRecurringAmountAbs, setVrRecurringAmountAbs] = useState<number | null>(null)
  const [vrInitialValue, setVrInitialValue] = useState<number | null>(null)

  const typeMeta = meta.strategyTypes.find((t) => t.code === type)
  const availableTickers = typeMeta?.availableTickers ?? []
  const divisionCountOptions = typeMeta?.divisionCounts ?? []

  function setType(next: BacktestType) {
    setTypeState(next)
    const nextMeta = meta.strategyTypes.find((t) => t.code === next)
    setTicker(nextMeta?.availableTickers[0] ?? '')
    setDivisionCount(null)
    setVrBandWidth(null)
    setVrIntervalWeeks(null)
    setVrRecurringMode('HOLD')
    setVrRecurringAmountAbs(null)
    setVrInitialValue(null)
  }

  const vrRecurringAmount =
    vrRecurringMode === 'HOLD' ? 0 : vrRecurringMode === 'WITHDRAW' ? -(vrRecurringAmountAbs ?? 0) : (vrRecurringAmountAbs ?? 0)

  const submitDisabledReason = useMemo(() => {
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
      if (vrBandWidth == null || vrBandWidth <= 0) return 'VR 밴드 폭은 0보다 커야 합니다'
      if (vrIntervalWeeks == null || vrIntervalWeeks <= 0) return 'VR 리밸런싱 주기는 1 이상이어야 합니다'
      if (vrInitialValue == null || vrInitialValue <= 0) return 'VR 초기 V값은 0보다 커야 합니다'
      if (vrRecurringMode !== 'HOLD' && vrRecurringAmountAbs == null) return '적립/인출 금액을 입력하세요'
    }
    return null
  }, [
    ticker,
    seed,
    avgPrice,
    quantity,
    from,
    to,
    type,
    divisionCountOptions.length,
    divisionCount,
    vrBandWidth,
    vrIntervalWeeks,
    vrInitialValue,
    vrRecurringMode,
    vrRecurringAmountAbs,
  ])

  function buildParams(): BacktestParams {
    return {
      type,
      ticker,
      from,
      to,
      seed: seed ?? 0,
      initialHoldings: quantity != null && quantity > 0 ? quantity : undefined,
      initialAvgPrice: quantity != null && quantity > 0 ? (avgPrice ?? undefined) : undefined,
      divisionCount: type === 'INFINITE' ? (divisionCount ?? undefined) : undefined,
      vrBandWidth: type === 'VR' ? (vrBandWidth ?? undefined) : undefined,
      vrIntervalWeeks: type === 'VR' ? (vrIntervalWeeks ?? undefined) : undefined,
      vrRecurringAmount: type === 'VR' ? vrRecurringAmount : undefined,
      vrInitialValue: type === 'VR' ? (vrInitialValue ?? undefined) : undefined,
    }
  }

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
    submitDisabledReason,
    run,
    reset,
    result: mutation.data,
    isLoading: mutation.isPending,
    errorMessage: mutation.error ? apiMsg(mutation.error, '백테스트 실행에 실패했습니다. 잠시 후 다시 시도해주세요') : null,
  }
}

export type UseBacktestFormResult = ReturnType<typeof useBacktestForm>
