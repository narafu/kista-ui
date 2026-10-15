'use client'

import type { Account } from '@entities/account'
import type { EtfBenchmarkSymbol, HousingBenchmarkRegion } from '@entities/stats'
import type { Strategy } from '@entities/strategy'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'
import type { Period } from './model/benchmarkPeriods'
import {
  BenchmarkAssetSelect,
  CustomDateRange,
  CustomMonthRange,
  StrategySelect,
} from './BenchmarkFilterFields'
import type { EtfBenchmarkContent } from './housingBenchmarkContent'

const ASSET_OPTIONS: { value: 'ETF' | 'HOUSING'; label: string }[] = [
  { value: 'ETF', label: 'ETF' },
  { value: 'HOUSING', label: '아파트' },
]

interface BenchmarkFilterBarProps {
  activeAsset: 'ETF' | 'HOUSING'
  setActiveAsset: (asset: 'ETF' | 'HOUSING') => void
  strategies: Strategy[]
  strategiesQuery: { isLoading: boolean; isError: boolean }
  accountsById: Map<string, Account>
  strategySelection: string
  setStrategySelection: (value: string) => void
  etfSymbol: EtfBenchmarkSymbol
  handleEtfSymbolChange: (symbol: EtfBenchmarkSymbol) => void
  etfBenchmarks: (EtfBenchmarkContent & { symbol: EtfBenchmarkSymbol })[]
  regionCode: string
  setRegionCode: (regionCode: string) => void
  regions: HousingBenchmarkRegion[]
  regionsQuery: { isLoading: boolean; isError: boolean }
  period: Period
  setPeriod: (period: Period) => void
  periods: { value: Period; label: string; months?: number }[]
  isCustomPeriod: boolean
  defaultTo: string
  customFromMonth: string
  setCustomFromMonth: (value: string) => void
  customToMonth: string
  setCustomToMonth: (value: string) => void
  customFromDate: string
  setCustomFromDate: (value: string) => void
  customToDate: string
  setCustomToDate: (value: string) => void
  showRefetchingStatus: boolean
}

export function BenchmarkFilterBar({
  activeAsset,
  setActiveAsset,
  strategies,
  strategiesQuery,
  accountsById,
  strategySelection,
  setStrategySelection,
  etfSymbol,
  handleEtfSymbolChange,
  etfBenchmarks,
  regionCode,
  setRegionCode,
  regions,
  regionsQuery,
  period,
  setPeriod,
  periods,
  isCustomPeriod,
  defaultTo,
  customFromMonth,
  setCustomFromMonth,
  customToMonth,
  setCustomToMonth,
  customFromDate,
  setCustomFromDate,
  customToDate,
  setCustomToDate,
  showRefetchingStatus,
}: BenchmarkFilterBarProps) {
  return (
    <>
      <SegmentedToggle
        aria-label="벤치마크 자산 유형"
        options={ASSET_OPTIONS}
        value={activeAsset}
        onChange={setActiveAsset}
        className="grid w-full grid-cols-2 sm:w-[240px]"
        itemClassName="min-h-10 px-4 text-sm"
      />

      <section aria-label="벤치마크 비교 필터" className="border-b border-border pb-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:items-end">
          {/* 투자 범위 토글 없이 전략 드롭다운 하나로 전체/없음/개별 전략을 모두 선택한다 — ETF·아파트 공통 */}
          <StrategySelect
            strategies={strategies}
            strategiesQuery={strategiesQuery}
            accountsById={accountsById}
            strategySelection={strategySelection}
            setStrategySelection={setStrategySelection}
          />

          <BenchmarkAssetSelect
            activeAsset={activeAsset}
            etfSymbol={etfSymbol}
            handleEtfSymbolChange={handleEtfSymbolChange}
            etfBenchmarks={etfBenchmarks}
            regionCode={regionCode}
            setRegionCode={setRegionCode}
            regions={regions}
            regionsQuery={regionsQuery}
          />

          <div>
            <p className="text-xs font-medium text-muted-foreground">비교 기간</p>
            <SegmentedToggle
              aria-label="비교 기간"
              options={periods}
              value={period}
              onChange={setPeriod}
              className="mt-1 grid w-full grid-cols-5"
              itemClassName="min-h-10 px-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            {isCustomPeriod && activeAsset === 'ETF' ? (
              <CustomDateRange
                customFromDate={customFromDate}
                setCustomFromDate={setCustomFromDate}
                customToDate={customToDate}
                setCustomToDate={setCustomToDate}
                defaultTo={defaultTo}
              />
            ) : isCustomPeriod ? (
              <CustomMonthRange
                customFromMonth={customFromMonth}
                setCustomFromMonth={setCustomFromMonth}
                customToMonth={customToMonth}
                setCustomToMonth={setCustomToMonth}
                defaultTo={defaultTo}
              />
            ) : null}
          </div>
        </div>
        {showRefetchingStatus ? (
          <p
            role="status"
            aria-live="polite"
            aria-label="갱신 중"
            className="mt-3 text-right text-xs text-muted-foreground"
          >
            갱신 중
          </p>
        ) : null}
      </section>
    </>
  )
}
