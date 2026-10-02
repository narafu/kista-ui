import { useMemo } from 'react'
import { DEFAULT_RUNTIME_BENCHMARKS, useRuntimeConfigQuery } from '@entities/runtime-config'
import { getEtfBenchmarkContent } from '../housingBenchmarkContent'
import { uniqueSymbols } from './benchmarkPeriods'

export function useEtfBenchmarkOptions() {
  const runtimeConfigQuery = useRuntimeConfigQuery()
  const runtimeEtfSettings = runtimeConfigQuery.data?.benchmarks?.etf ?? DEFAULT_RUNTIME_BENCHMARKS.etf
  const etfSymbols = useMemo(() => {
    const allowedValues = uniqueSymbols(runtimeEtfSettings.allowedValues)
    return allowedValues.length > 0 ? allowedValues : DEFAULT_RUNTIME_BENCHMARKS.etf.allowedValues
  }, [runtimeEtfSettings.allowedValues])
  const defaultEtfSymbol = etfSymbols.includes(runtimeEtfSettings.defaultValue)
    ? runtimeEtfSettings.defaultValue
    : etfSymbols[0]
  const etfBenchmarks = useMemo(() => etfSymbols.map((symbol) => ({
    ...getEtfBenchmarkContent(symbol),
    symbol,
  })), [etfSymbols])
  return { etfSymbols, defaultEtfSymbol, etfBenchmarks }
}
