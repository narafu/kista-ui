'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { EtfBenchmarkSymbol, HousingBenchmarkParams } from '@entities/stats'
import { DEFAULT_HOUSING_REGION_CODE } from '../housingBenchmarkContent'
import {
  BENCHMARK_PERIODS,
  fromMonthInput,
  subtractMonths,
  toMonthInput,
  type Period,
} from './benchmarkPeriods'

type Scope = HousingBenchmarkParams['scope']

// 투자 범위 토글과 전략 드롭다운을 하나로 합친 선택값. ETF·아파트 탭 공용.
// 'ALL'=전체 포트폴리오, 'NONE'=비교 없이 벤치마크 원본 데이터만, 그 외=전략 id
export type BenchmarkStrategySelection = 'ALL' | 'NONE' | string

type BenchmarkSelection =
  | { type: 'HOUSING'; regionCode: string }
  | { type: 'ETF'; symbol: EtfBenchmarkSymbol }

interface RuntimeEtfConfig {
  symbols: EtfBenchmarkSymbol[]
  defaultSymbol: EtfBenchmarkSymbol
}

// 필터 상태 전체와 from/to/selection/query params 파생을 한 훅에 모은다 —
// 개별 useState 15개 이상을 컨테이너에서 분리해 가독성을 확보한다.
export function useBenchmarkFilters(defaultTo: string, runtimeEtf: RuntimeEtfConfig) {
  const { symbols: etfSymbols, defaultSymbol: defaultEtfSymbol } = runtimeEtf
  // 전략 선택은 ETF·아파트 탭에서 서로 독립 — 탭 전환 시 지역/심볼 선택처럼 각자 마지막 선택을 유지한다
  const [housingStrategySelection, setHousingStrategySelection] = useState<BenchmarkStrategySelection>('ALL')
  const [etfStrategySelection, setEtfStrategySelection] = useState<BenchmarkStrategySelection>('ALL')
  const [activeAsset, setActiveAsset] = useState<'ETF' | 'HOUSING'>('ETF')
  const strategySelection = activeAsset === 'ETF' ? etfStrategySelection : housingStrategySelection
  const setStrategySelection = activeAsset === 'ETF' ? setEtfStrategySelection : setHousingStrategySelection
  const selectedStrategyId = strategySelection !== 'ALL' && strategySelection !== 'NONE'
    ? strategySelection
    : undefined
  const scope: Scope = selectedStrategyId ? 'STRATEGY' : 'PORTFOLIO'

  const [regionCode, setRegionCode] = useState<string>(DEFAULT_HOUSING_REGION_CODE)
  const [etfSymbol, setEtfSymbol] = useState<EtfBenchmarkSymbol>(defaultEtfSymbol)
  const hasUserSelectedEtfRef = useRef(false)
  const handleEtfSymbolChange = useCallback((symbol: EtfBenchmarkSymbol) => {
    hasUserSelectedEtfRef.current = true
    setEtfSymbol(symbol)
  }, [])
  const selection: BenchmarkSelection = activeAsset === 'ETF' ? { type: 'ETF', symbol: etfSymbol } : { type: 'HOUSING', regionCode }
  const [housingPeriod, setHousingPeriod] = useState<Period>('1Y')
  const [etfPeriod, setEtfPeriod] = useState<Period>('3M')
  const period = activeAsset === 'ETF' ? etfPeriod : housingPeriod
  const setPeriod = activeAsset === 'ETF' ? setEtfPeriod : setHousingPeriod
  const periods = BENCHMARK_PERIODS
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

  const strategyIdParam = scope === 'STRATEGY' && selectedStrategyId ? { strategyId: selectedStrategyId } : {}
  const buildParams = (): HousingBenchmarkParams => (
    selection.type === 'HOUSING'
      ? {
          scope,
          ...strategyIdParam,
          benchmarkType: 'HOUSING',
          regionCode: selection.regionCode,
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
  )

  return {
    activeAsset,
    setActiveAsset,
    regionCode,
    setRegionCode,
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
    scope,
    strategySelection,
    setStrategySelection,
    selectedStrategyId,
    selection,
    from,
    to,
    buildParams,
  }
}
