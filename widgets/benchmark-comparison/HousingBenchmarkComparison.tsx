'use client'

import { useCallback, useMemo, useState } from 'react'
import { useHousingBenchmarkQuery } from '@entities/stats'
import type { HousingBenchmark, HousingBenchmarkRegion } from '@entities/stats'
import { DEFAULT_RUNTIME_BENCHMARKS, useRuntimeConfigQuery } from '@entities/runtime-config'
import { EmptyState } from '@shared/ui/EmptyState'
import { SectionError } from '@shared/ui/SectionError'
import { BenchmarkFilterBar } from './BenchmarkFilterBar'
import { BenchmarkLoading, StrategyListLoading } from './BenchmarkStates'
import { HousingBenchmarkChart } from './HousingBenchmarkChart'
import { HousingBenchmarkSummary } from './HousingBenchmarkSummary'
import { HousingBenchmarkInfo } from './HousingBenchmarkInfo'
import { HousingBenchmarkQuintileTrendChart } from './HousingBenchmarkQuintileTrendChart'
import { HousingBenchmarkRegionQuintileInfo } from './HousingBenchmarkRegionQuintileInfo'
import { emptyMessage, isHousingQuintile, uniqueSymbols } from './model/benchmarkPeriods'
import { useBenchmarkFilters } from './model/useBenchmarkFilters'
import { useBenchmarkStrategyOptions } from './model/useBenchmarkStrategyOptions'
import {
  DEFAULT_HOUSING_REGION_NAME,
  getEtfBenchmarkContent,
} from './housingBenchmarkContent'

interface Props {
  enabled: boolean
  defaultTo: string
}

export function HousingBenchmarkComparison({ enabled, defaultTo }: Props) {
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

  const filters = useBenchmarkFilters(defaultTo, { symbols: etfSymbols, defaultSymbol: defaultEtfSymbol })
  const { scope, activeAsset, quintile, selection, from, to } = filters

  const [trendRegionName, setTrendRegionName] = useState<string>(DEFAULT_HOUSING_REGION_NAME)
  const handleTrendRegionChange = useCallback(
    (region: HousingBenchmarkRegion) => setTrendRegionName(region.name ?? DEFAULT_HOUSING_REGION_NAME),
    [],
  )

  const isStrategyScope = scope === 'STRATEGY'
  const strategyOptions = useBenchmarkStrategyOptions(enabled, isStrategyScope, filters.selectedStrategyId)
  const {
    strategiesQuery,
    accountsById,
    strategies,
    effectiveStrategyId,
    strategyListFailed,
    strategyListLoading,
    strategyListEmpty,
  } = strategyOptions

  const canQuery = scope === 'PORTFOLIO' || Boolean(effectiveStrategyId)
  const params = filters.buildParams(effectiveStrategyId)
  const query = useHousingBenchmarkQuery(params, enabled && canQuery)
  const data = query.data
  const fallbackQuintile = selection.type === 'HOUSING' ? selection.quintile : 3
  const responseQuintile = data?.benchmark?.quintile
  const displayedQuintile = isHousingQuintile(responseQuintile) ? responseQuintile : fallbackQuintile
  const benchmarkLabel = selection.type === 'ETF'
    ? (data?.benchmark?.label ?? selection.symbol)
    : (data?.benchmark?.label ?? `서울 아파트 ${displayedQuintile}분위`)
  const benchmarkCurrency: 'USD' | 'KRW' = data?.quality?.benchmarkCurrency === 'USD' ? 'USD' : 'KRW'
  const fallbackBenchmark: HousingBenchmark = selection.type === 'HOUSING'
    ? {
        assetType: 'HOUSING',
        regionCode: null,
        regionName: null,
        quintile: selection.quintile,
        symbol: null,
        label: benchmarkLabel,
        sourceUpdatedDate: null,
      }
    : {
        assetType: 'ETF',
        regionCode: null,
        regionName: null,
        quintile: null,
        symbol: selection.symbol,
        label: benchmarkLabel,
        sourceUpdatedDate: null,
      }
  const responseScope = data?.scope === 'STRATEGY' ? 'STRATEGY' : 'PORTFOLIO'
  const investmentLabel = responseScope === 'PORTFOLIO'
    ? '전체 포트폴리오'
    : data?.strategy?.type && data.strategy.ticker
      ? `${data.strategy.type} · ${data.strategy.ticker}`
      : '개별 전략'

  return (
    <div className="flex flex-col gap-4">
      <BenchmarkFilterBar
        activeAsset={filters.activeAsset}
        setActiveAsset={filters.setActiveAsset}
        scope={filters.scope}
        setScope={filters.setScope}
        strategies={strategies}
        strategiesQuery={strategiesQuery}
        accountsById={accountsById}
        effectiveStrategyId={effectiveStrategyId}
        setSelectedStrategyId={filters.setSelectedStrategyId}
        etfSymbol={filters.etfSymbol}
        handleEtfSymbolChange={filters.handleEtfSymbolChange}
        etfBenchmarks={etfBenchmarks}
        quintile={filters.quintile}
        setQuintile={filters.setQuintile}
        period={filters.period}
        setPeriod={filters.setPeriod}
        periods={filters.periods}
        isCustomPeriod={filters.isCustomPeriod}
        defaultTo={defaultTo}
        customFromMonth={filters.customFromMonth}
        setCustomFromMonth={filters.setCustomFromMonth}
        customToMonth={filters.customToMonth}
        setCustomToMonth={filters.setCustomToMonth}
        customFromDate={filters.customFromDate}
        setCustomFromDate={filters.setCustomFromDate}
        customToDate={filters.customToDate}
        setCustomToDate={filters.setCustomToDate}
        showRefetchingStatus={query.isFetching && query.isPlaceholderData}
      />

      {strategyListLoading ? (
        <StrategyListLoading />
      ) : strategyListFailed ? (
        <div role="alert" aria-live="assertive">
          <SectionError message="전략 목록을 불러오지 못했습니다" />
        </div>
      ) : strategyListEmpty ? (
        <div role="status" aria-live="polite">
          <EmptyState message="비교할 개별 전략이 없습니다." />
        </div>
      ) : !canQuery ? null : query.isLoading ? (
        <BenchmarkLoading />
      ) : query.isError && !data ? (
        <div role="alert" aria-live="assertive">
          <SectionError message="벤치마크 비교를 불러오지 못했습니다" />
        </div>
      ) : data && data.summary && (data.points?.length ?? 0) > 0 ? (
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
      ) : data ? (
        <EmptyState message={emptyMessage(data.emptyReason, activeAsset === 'ETF')} />
      ) : null}

      {/* ETF 탭에서만 표시되는 위험 안내 — 부동산(서울 분위) 안내는 아래 아파트 탭의 "가격 추이" 비교지역 선택과 연동된 안내로 이동 */}
      {activeAsset === 'ETF' ? (
        <HousingBenchmarkInfo benchmark={data?.benchmark ?? fallbackBenchmark} notice={data?.quality?.notice} />
      ) : null}

      {/* 아파트 탭에서만 표시 — 사용자 투자 데이터와 무관하게 항상 나오는 분위 원본 시계열, 상단 "벤치마크 자산" 분위 선택과 연동, 상단 "비교 기간" 토글과 동일한 from/to 사용 */}
      {activeAsset === 'HOUSING' ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">참고 · 아파트 시세 원본 데이터</p>
          <div className="flex flex-col gap-4">
            <HousingBenchmarkQuintileTrendChart enabled={enabled} quintile={quintile} from={from} to={to} onRegionChange={handleTrendRegionChange} />
            <HousingBenchmarkRegionQuintileInfo regionName={trendRegionName} quintile={quintile} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
