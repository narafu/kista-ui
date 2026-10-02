'use client'

import type { HousingBenchmark, HousingBenchmarkComparison } from '@entities/stats'
import { EmptyState } from '@shared/ui/EmptyState'
import { SectionError } from '@shared/ui/SectionError'
import { BenchmarkLoading } from './BenchmarkStates'
import { HousingBenchmarkChart } from './HousingBenchmarkChart'
import { HousingBenchmarkSummary } from './HousingBenchmarkSummary'
import { emptyMessage } from './model/benchmarkPeriods'

interface Props {
  query: { isLoading: boolean; isError: boolean; data: HousingBenchmarkComparison | undefined }
  activeAsset: 'ETF' | 'HOUSING'
  investmentLabel: string
  benchmarkLabel: string
  benchmarkCurrency: 'USD' | 'KRW'
  fallbackBenchmark: HousingBenchmark
}

export function BenchmarkResult({
  query,
  activeAsset,
  investmentLabel,
  benchmarkLabel,
  benchmarkCurrency,
  fallbackBenchmark,
}: Props) {
  const data = query.data
  if (query.isLoading) return <BenchmarkLoading />
  if (query.isError && !data) {
    return (
      <div role="alert" aria-live="assertive">
        <SectionError message="벤치마크 비교를 불러오지 못했습니다" />
      </div>
    )
  }
  if (!data) return null
  if (data.summary && (data.points?.length ?? 0) > 0) {
    return (
      <>
        <HousingBenchmarkSummary
          summary={data.summary}
          investmentLabel={investmentLabel}
          benchmarkLabel={benchmarkLabel}
          benchmarkCurrency={benchmarkCurrency}
        />
        <HousingBenchmarkChart
          points={data.points ?? []}
          investmentLabel={investmentLabel}
          benchmark={data.benchmark ?? fallbackBenchmark}
          benchmarkCurrency={benchmarkCurrency}
        />
      </>
    )
  }
  return <EmptyState message={emptyMessage(data.emptyReason, activeAsset === 'ETF')} />
}
