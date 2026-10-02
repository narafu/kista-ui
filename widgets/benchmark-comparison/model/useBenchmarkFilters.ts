'use client'

import { useCallback, useState } from 'react'
import type { EtfBenchmarkSymbol, HousingBenchmarkParams } from '@entities/stats'
import { DEFAULT_HOUSING_REGION_CODE } from '@entities/stats'
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

export type BenchmarkSelection =
  | { type: 'HOUSING'; regionCode: string }
  | { type: 'ETF'; symbol: EtfBenchmarkSymbol }

interface RuntimeEtfConfig {
  symbols: EtfBenchmarkSymbol[]
  defaultSymbol: EtfBenchmarkSymbol
}

interface RangeInput {
  period: Period
  isEtf: boolean
  defaultTo: string
  customFromMonth: string
  customToMonth: string
  customFromDate: string
  customToDate: string
}

function resolveCustomRange(r: RangeInput) {
  if (r.isEtf) return { from: r.customFromDate || undefined, to: r.customToDate || r.defaultTo }
  return {
    from: r.customFromMonth ? fromMonthInput(r.customFromMonth) : undefined,
    to: r.customToMonth ? fromMonthInput(r.customToMonth) : r.defaultTo,
  }
}

function resolveRange(r: RangeInput) {
  if (r.period === 'CUSTOM') return resolveCustomRange(r)
  const months = BENCHMARK_PERIODS.find((item) => item.value === r.period)?.months
  return { from: months ? subtractMonths(r.defaultTo, months) : undefined, to: r.defaultTo }
}

function buildBenchmarkParams(
  selection: BenchmarkSelection,
  scope: Scope,
  selectedStrategyId: string | undefined,
  from: string | undefined,
  to: string,
): HousingBenchmarkParams {
  const strategyIdParam = scope === 'STRATEGY' && selectedStrategyId ? { strategyId: selectedStrategyId } : {}
  const range = { ...(from ? { from } : {}), to }
  return selection.type === 'HOUSING'
    ? { scope, ...strategyIdParam, benchmarkType: 'HOUSING', regionCode: selection.regionCode, ...range }
    : { scope, ...strategyIdParam, benchmarkType: 'ETF', symbol: selection.symbol, ...range }
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
  // 사용자가 고른 심볼이 런타임 허용 목록에 있을 때만 유지하고, 아니면(미선택 포함) 런타임 기본값을 따른다
  const [userEtfSymbol, setUserEtfSymbol] = useState<EtfBenchmarkSymbol | null>(null)
  const etfSymbol = userEtfSymbol !== null && etfSymbols.includes(userEtfSymbol) ? userEtfSymbol : defaultEtfSymbol
  const handleEtfSymbolChange = useCallback((symbol: EtfBenchmarkSymbol) => setUserEtfSymbol(symbol), [])
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

  const { from, to } = resolveRange({
    period,
    isEtf: activeAsset === 'ETF',
    defaultTo,
    customFromMonth,
    customToMonth,
    customFromDate,
    customToDate,
  })
  const isCustomPeriod = period === 'CUSTOM'
  const buildParams = () => buildBenchmarkParams(selection, scope, selectedStrategyId, from, to)

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
