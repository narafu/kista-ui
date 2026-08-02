'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { EtfBenchmarkSymbol, HousingBenchmarkParams } from '@entities/stats'
import type { HousingQuintile } from '../housingBenchmarkContent'
import {
  ETF_PERIODS,
  fromMonthInput,
  HOUSING_PERIODS,
  subtractMonths,
  toMonthInput,
  type Period,
} from './benchmarkPeriods'

type Scope = HousingBenchmarkParams['scope']

type BenchmarkSelection =
  | { type: 'HOUSING'; quintile: HousingQuintile }
  | { type: 'ETF'; symbol: EtfBenchmarkSymbol }

interface RuntimeEtfConfig {
  symbols: EtfBenchmarkSymbol[]
  defaultSymbol: EtfBenchmarkSymbol
}

// 필터 상태 전체와 from/to/selection/query params 파생을 한 훅에 모은다 —
// 개별 useState 15개 이상을 컨테이너에서 분리해 가독성을 확보한다.
export function useBenchmarkFilters(defaultTo: string, runtimeEtf: RuntimeEtfConfig) {
  const { symbols: etfSymbols, defaultSymbol: defaultEtfSymbol } = runtimeEtf
  const [scope, setScope] = useState<Scope>('PORTFOLIO')
  const [selectedStrategyId, setSelectedStrategyId] = useState('')
  const [activeAsset, setActiveAsset] = useState<'ETF' | 'HOUSING'>('ETF')
  const [quintile, setQuintile] = useState<HousingQuintile>(3)
  const [etfSymbol, setEtfSymbol] = useState<EtfBenchmarkSymbol>(defaultEtfSymbol)
  const hasUserSelectedEtfRef = useRef(false)
  const handleEtfSymbolChange = useCallback((symbol: EtfBenchmarkSymbol) => {
    hasUserSelectedEtfRef.current = true
    setEtfSymbol(symbol)
  }, [])
  const selection: BenchmarkSelection = activeAsset === 'ETF' ? { type: 'ETF', symbol: etfSymbol } : { type: 'HOUSING', quintile }
  const [housingPeriod, setHousingPeriod] = useState<Period>('1Y')
  const [etfPeriod, setEtfPeriod] = useState<Period>('3M')
  const period = activeAsset === 'ETF' ? etfPeriod : housingPeriod
  const setPeriod = activeAsset === 'ETF' ? setEtfPeriod : setHousingPeriod
  const periods = activeAsset === 'ETF' ? ETF_PERIODS : HOUSING_PERIODS
  const [customFromMonth, setCustomFromMonth] = useState(() => toMonthInput(subtractMonths(defaultTo, 12)))
  const [customToMonth, setCustomToMonth] = useState(() => toMonthInput(defaultTo))
  const [customFromDate, setCustomFromDate] = useState(() => subtractMonths(defaultTo, 3))
  const [customToDate, setCustomToDate] = useState(() => defaultTo)

  useEffect(() => {
    if (hasUserSelectedEtfRef.current && etfSymbols.includes(etfSymbol)) return
    setEtfSymbol(defaultEtfSymbol)
  }, [defaultEtfSymbol, etfSymbol, etfSymbols])

  const selectedPeriod = periods.find((item) => item.value === period)
  const isCustomPeriod = period === 'CUSTOM'
  const from = isCustomPeriod
    ? (activeAsset === 'ETF'
        ? (customFromDate || undefined)
        : (customFromMonth ? fromMonthInput(customFromMonth) : undefined))
    : selectedPeriod?.months ? subtractMonths(defaultTo, selectedPeriod.months) : undefined
  const to = isCustomPeriod
    ? (activeAsset === 'ETF' ? (customToDate || defaultTo) : (customToMonth ? fromMonthInput(customToMonth) : defaultTo))
    : defaultTo

  // effectiveStrategyId는 useBenchmarkStrategyOptions에서만 확정되므로 params 조립을 함수로 미룬다
  // (selection이 매 렌더 새 객체라 useCallback으로 감싸도 메모이제이션 효과가 없어 일반 함수로 둔다)
  const buildParams = (effectiveStrategyId: string | undefined): HousingBenchmarkParams => {
    const strategyIdParam = scope === 'STRATEGY' && effectiveStrategyId ? { strategyId: effectiveStrategyId } : {}
    return selection.type === 'HOUSING'
      ? {
          scope,
          ...strategyIdParam,
          benchmarkType: 'HOUSING',
          quintile: selection.quintile,
          ...(from ? { from } : {}),
          to,
        }
      : {
          scope,
          ...strategyIdParam,
          benchmarkType: 'ETF',
          symbol: selection.symbol,
          ...(from ? { from } : {}),
          to,
        }
  }

  return {
    scope,
    setScope,
    activeAsset,
    setActiveAsset,
    quintile,
    setQuintile,
    etfSymbol,
    handleEtfSymbolChange,
    period,
    setPeriod,
    periods,
    isCustomPeriod,
    customFromMonth,
    setCustomFromMonth,
    customToMonth,
    setCustomToMonth,
    customFromDate,
    setCustomFromDate,
    customToDate,
    setCustomToDate,
    selectedStrategyId,
    setSelectedStrategyId,
    selection,
    from,
    to,
    buildParams,
  }
}
