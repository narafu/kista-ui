'use client'

import { useEffect, type ReactNode } from 'react'
import { useMeta } from '@entities/meta'
import { useHousingBenchmarkQuery, useHousingBenchmarkRegionsQuery, useStatsCurrency } from '@entities/stats'
import { CurrencyToggle } from '@shared/ui/CurrencyToggle'
import { toCurrency } from '@shared/lib/api-schema'
import { BenchmarkFilterBar } from './BenchmarkFilterBar'
import { BenchmarkResult } from './BenchmarkResult'
import { EtfPriceChart } from './EtfPriceChart'
import { HousingBenchmarkInfo } from './HousingBenchmarkInfo'
import { HousingPriceIndexChart } from './HousingPriceIndexChart'
import { buildFallbackBenchmark, resolveBenchmarkLabel, resolveInvestmentLabel } from './model/benchmarkView'
import { useBenchmarkFilters } from './model/useBenchmarkFilters'
import { useEtfBenchmarkOptions } from './model/useEtfBenchmarkOptions'
import { useBenchmarkStrategyOptions } from './model/useBenchmarkStrategyOptions'
import { DEFAULT_HOUSING_REGION_NAME } from '@entities/stats'

interface Props {
  enabled: boolean
  defaultTo: string
  renderHousingExtras?: (range: { from?: string; to: string }) => ReactNode
}

export function HousingBenchmarkComparison({ enabled, defaultTo, renderHousingExtras }: Props) {
  const { labelOf } = useMeta()
  const { etfSymbols, defaultEtfSymbol, etfBenchmarks } = useEtfBenchmarkOptions()
  const filters = useBenchmarkFilters(defaultTo, { symbols: etfSymbols, defaultSymbol: defaultEtfSymbol })
  const { activeAsset, selection, from, to } = filters
  const selectedEtfBenchmark = etfBenchmarks.find((item) => item.symbol === filters.etfSymbol)

  const regionsQuery = useHousingBenchmarkRegionsQuery(enabled)
  const regions = regionsQuery.data?.regions ?? []
  const selectedRegionName = regions.find((region) => region.code === filters.regionCode)?.name
    ?? DEFAULT_HOUSING_REGION_NAME

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
  // 합산 통화는 전체 포트폴리오에만 적용된다 — 개별 전략은 서버가 그 전략 계좌 통화를 쓴다
  const { currency, options: currencyOptions, setCurrency } = useStatsCurrency()
  const baseParams = filters.buildParams()
  const isPortfolio = baseParams.scope === 'PORTFOLIO'
  const params = isPortfolio ? { ...baseParams, currency } : baseParams
  const query = useHousingBenchmarkQuery(params, enabled && canQuery)
  const data = query.data
  const benchmarkLabel = resolveBenchmarkLabel(selection, data, selectedRegionName)
  // 투자 통화는 STRATEGY면 전략 계좌 통화(USD·USDT·KRW), 전체 포트폴리오면 요청한 합산 통화 — 서버 quality가 SSOT
  const investmentCurrency = toCurrency(data?.quality?.investmentCurrency) ?? 'USD'
  const benchmarkCurrency: 'USD' | 'KRW' = data?.quality?.benchmarkCurrency === 'USD' ? 'USD' : 'KRW'
  const fallbackBenchmark = buildFallbackBenchmark(selection, selectedRegionName, benchmarkLabel)
  const investmentLabel = resolveInvestmentLabel(data, (type) => labelOf('strategyTypes', type))

  return (
    <div className="flex flex-col gap-4">
      {canQuery && isPortfolio ? <CurrencyToggle options={currencyOptions} value={currency} onChange={setCurrency} /> : null}
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

      {canQuery ? (
        <BenchmarkResult
          query={query}
          activeAsset={activeAsset}
          investmentLabel={investmentLabel}
          investmentCurrency={investmentCurrency}
          benchmarkLabel={benchmarkLabel}
          benchmarkCurrency={benchmarkCurrency}
          fallbackBenchmark={fallbackBenchmark}
        />
      ) : activeAsset === 'HOUSING' ? (
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
      )}

      {/* ETF 탭에서만 표시되는 위험 안내 — 부동산(서울 분위) 안내는 아래 아파트 탭의 "가격 추이" 비교지역 선택과 연동된 안내로 이동 */}
      {activeAsset === 'ETF' ? (
        <HousingBenchmarkInfo benchmark={data?.benchmark ?? fallbackBenchmark} notice={data?.quality?.notice} />
      ) : null}

      {/* 아파트 비교의 통화 기준(환율 미반영 또는 모두 KRW) 안내 — 문구는 서버가 투자 통화별로 만든다 — ETF는 위 안내 섹션이 같은 notice를 보여준다 */}
      {activeAsset === 'HOUSING' && canQuery && data?.benchmark?.assetType === 'HOUSING' && data.quality?.notice ? (
        <p className="text-xs leading-5 text-muted-foreground">{data.quality.notice}</p>
      ) : null}

      {/* 아파트 탭에서만 표시 — 5분위 원본 시계열은 widgets/housing-quintile-trend가 담당,
          이 위젯은 그 존재를 모르고 콜백만 호출한다(app 레이어 BenchmarkPageContent가 연결) */}
      {activeAsset === 'HOUSING' ? renderHousingExtras?.({ from, to }) : null}
    </div>
  )
}
