import { useMemo } from 'react'
import { useMeta } from '@entities/meta'
import { getEtfBenchmarkContent } from '../housingBenchmarkContent'
import { uniqueSymbols } from './benchmarkPeriods'

// ETF 비교 자산 허용값·기본값은 관리자 운영 설정 — meta.benchmarkEtf가 SSOT
export function useEtfBenchmarkOptions() {
  const { allowedValues, defaultValue } = useMeta().meta.benchmarkEtf
  const etfSymbols = useMemo(() => uniqueSymbols(allowedValues), [allowedValues])
  const defaultEtfSymbol = etfSymbols.includes(defaultValue) ? defaultValue : (etfSymbols[0] ?? defaultValue)
  const etfBenchmarks = useMemo(() => etfSymbols.map((symbol) => ({
    ...getEtfBenchmarkContent(symbol),
    symbol,
  })), [etfSymbols])
  return { etfSymbols, defaultEtfSymbol, etfBenchmarks }
}
