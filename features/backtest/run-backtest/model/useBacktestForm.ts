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
    if (seed == null || seed <= 0) return '시드는 0보다 커야 합니다'
    if (!from || !to) return '기간을 선택하세요'
    if (from > to) return '시작일이 종료일보다 늦을 수 없습니다'
    if (type === 'INFINITE' && divisionCountOptions.length > 0 && divisionCount == null) {
      return '분할 수를 선택하세요'
    }
    if (type === 'VR') {
      if (vrBandWidth == null || vrBandWidth <= 0) return 'VR 밴드 폭은 0보다 커야 합니다'
      if (vrIntervalWeeks == null || vrIntervalWeeks <= 0) return 'VR 리밸런싱 주기는 1 이상이어야 합니다'
      if (vrInitialValue == null || vrInitialValue <= 0) return 'VR 초기 V값은 0보다 커야 합니다'
    }
    return null
  }, [ticker, seed, from, to, type, divisionCountOptions.length, divisionCount, vrBandWidth, vrIntervalWeeks, vrInitialValue])

  function buildParams(): BacktestParams {
    return {
      type,
      ticker,
      from,
      to,
      seed: seed as number,
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
    result: mutation.data,
    isLoading: mutation.isPending,
    errorMessage: mutation.error ? apiMsg(mutation.error, '백테스트 실행에 실패했습니다. 잠시 후 다시 시도해주세요') : null,
  }
}

export type UseBacktestFormResult = ReturnType<typeof useBacktestForm>
