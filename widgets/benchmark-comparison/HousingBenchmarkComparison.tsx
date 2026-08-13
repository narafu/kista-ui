'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useHousingBenchmarkQuery, useHousingBenchmarkRegionsQuery } from '@entities/stats'
import type { HousingBenchmark, HousingBenchmarkRegion } from '@entities/stats'
import { DEFAULT_RUNTIME_BENCHMARKS, useRuntimeConfigQuery } from '@entities/runtime-config'
import { EmptyState } from '@shared/ui/EmptyState'
import { SectionError } from '@shared/ui/SectionError'
import { BenchmarkFilterBar } from './BenchmarkFilterBar'
import { BenchmarkLoading } from './BenchmarkStates'
import { EtfPriceChart } from './EtfPriceChart'
import { HousingBenchmarkChart } from './HousingBenchmarkChart'
import { HousingBenchmarkSummary } from './HousingBenchmarkSummary'
import { HousingBenchmarkInfo } from './HousingBenchmarkInfo'
import { HousingBenchmarkQuintileTrendChart } from './HousingBenchmarkQuintileTrendChart'
import { HousingPriceIndexChart } from './HousingPriceIndexChart'
import { HousingBenchmarkRegionQuintileInfo } from './HousingBenchmarkRegionQuintileInfo'
import { emptyMessage, uniqueSymbols } from './model/benchmarkPeriods'
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
  const { activeAsset, selection, from, to } = filters
  const selectedEtfBenchmark = etfBenchmarks.find((item) => item.symbol === filters.etfSymbol)

  const regionsQuery = useHousingBenchmarkRegionsQuery(enabled)
  const regions = regionsQuery.data?.regions ?? []
  const selectedRegionName = regions.find((region) => region.code === filters.regionCode)?.name
    ?? DEFAULT_HOUSING_REGION_NAME

  const [trendRegionName, setTrendRegionName] = useState<string>(DEFAULT_HOUSING_REGION_NAME)
  const handleTrendRegionChange = useCallback(
    (region: HousingBenchmarkRegion) => setTrendRegionName(region.name ?? DEFAULT_HOUSING_REGION_NAME),
    [],
  )

  // 전략 드롭다운은 두 자산 탭 모두 항상 노출되므로 조건 없이 로드한다
  const strategyOptions = useBenchmarkStrategyOptions(enabled)
  const { strategiesQuery, accountsQuery, accountsById, strategies, hasStrategyList } = strategyOptions
  // 드롭다운 placeholder는 전략·계좌 두 쿼리 중 어느 쪽이 로딩·실패 중이어도 그 상태를 반영한다
  const strategyDropdownStatus = {
    isLoading: strategiesQuery.isLoading || accountsQuery.isLoading,
    isError: strategiesQuery.isError || accountsQuery.isError,
  }

  // 선택된 전략이 목록에서 사라지면(삭제·재조회) 드롭다운이 dangling id를 계속 들고 있지 않도록 '전체'로 되돌린다
  useEffect(() => {
    if (!filters.selectedStrategyId || !hasStrategyList) return
    if (strategies.some((strategy) => strategy.id === filters.selectedStrategyId)) return
    filters.setStrategySelection('ALL')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.selectedStrategyId, hasStrategyList, strategies])

  const isNone = filters.strategySelection === 'NONE'
  const canQuery = !isNone
  const params = filters.buildParams()
  const query = useHousingBenchmarkQuery(params, enabled && canQuery)
  const data = query.data
  const benchmarkLabel = selection.type === 'ETF'
    ? (data?.benchmark?.label ?? selection.symbol)
    : (data?.benchmark?.label ?? `${selectedRegionName} 아파트 매매가격지수`)
  const benchmarkCurrency: 'USD' | 'KRW' = data?.quality?.benchmarkCurrency === 'USD' ? 'USD' : 'KRW'
  const fallbackBenchmark: HousingBenchmark = selection.type === 'HOUSING'
    ? {
        assetType: 'HOUSING',
        regionCode: selection.regionCode,
        regionName: selectedRegionName,
        symbol: null,
        label: benchmarkLabel,
        sourceUpdatedDate: null,
      }
    : {
        assetType: 'ETF',
        regionCode: null,
        regionName: null,
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
        strategies={strategies}
        strategiesQuery={strategyDropdownStatus}
        accountsById={accountsById}
        strategySelection={filters.strategySelection}
        setStrategySelection={filters.setStrategySelection}
        etfSymbol={filters.etfSymbol}
        handleEtfSymbolChange={filters.handleEtfSymbolChange}
        etfBenchmarks={etfBenchmarks}
        regionCode={filters.regionCode}
        setRegionCode={filters.setRegionCode}
        regions={regions}
        regionsQuery={{ isLoading: regionsQuery.isLoading, isError: regionsQuery.isError }}
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

      {!canQuery ? (
        activeAsset === 'HOUSING' ? (
          <HousingPriceIndexChart
            enabled={enabled}
            from={from}
            to={to}
            regionCode={filters.regionCode}
            regionLabel={selectedRegionName}
          />
        ) : (
          <EtfPriceChart
            enabled={enabled}
            from={from}
            to={to}
            symbol={filters.etfSymbol}
            label={selectedEtfBenchmark?.label ?? filters.etfSymbol}
          />
        )
      ) : query.isLoading ? (
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

      {/* 아파트 탭에서만 표시 — 사용자 투자 데이터와 무관하게 항상 나오는 5분위 원본 시계열, 위 비교 결과와 독립적, 상단 "비교 기간" 토글과 동일한 from/to 사용 */}
      {activeAsset === 'HOUSING' ? (
        <div className="flex flex-col gap-4">
          <HousingBenchmarkQuintileTrendChart enabled={enabled} from={from} to={to} onRegionChange={handleTrendRegionChange} />
          <HousingBenchmarkRegionQuintileInfo regionName={trendRegionName} />
        </div>
      ) : null}
    </div>
  )
}
