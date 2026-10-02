import type { HousingBenchmark, HousingBenchmarkComparison } from '@entities/stats'
import type { BenchmarkSelection } from './useBenchmarkFilters'

export function resolveBenchmarkLabel(
  selection: BenchmarkSelection,
  data: HousingBenchmarkComparison | undefined,
  selectedRegionName: string,
) {
  const fallback = selection.type === 'ETF' ? selection.symbol : `${selectedRegionName} 아파트 매매가격지수`
  return data?.benchmark?.label ?? fallback
}

export function buildFallbackBenchmark(
  selection: BenchmarkSelection,
  selectedRegionName: string,
  label: string,
): HousingBenchmark {
  return selection.type === 'HOUSING'
    ? {
        assetType: 'HOUSING',
        regionCode: selection.regionCode,
        regionName: selectedRegionName,
        symbol: null,
        label,
        sourceUpdatedDate: null,
      }
    : {
        assetType: 'ETF',
        regionCode: null,
        regionName: null,
        symbol: selection.symbol,
        label,
        sourceUpdatedDate: null,
      }
}

export function resolveInvestmentLabel(data: HousingBenchmarkComparison | undefined) {
  if (data?.scope !== 'STRATEGY') return '전체 포트폴리오'
  return data.strategy?.type && data.strategy.ticker
    ? `${data.strategy.type} · ${data.strategy.ticker}`
    : '개별 전략'
}
