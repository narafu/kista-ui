'use client'

import type { Account } from '@entities/account'
import type { EtfBenchmarkSymbol, HousingBenchmarkRegion } from '@entities/stats'
import type { Strategy } from '@entities/strategy'
import { cn } from '@shared/lib/utils'
import type { Period } from './model/benchmarkPeriods'
import {
  ASSET_SELECT_CLASS,
  BenchmarkAssetSelect,
  CustomDateRange,
  CustomMonthRange,
  StrategySelect,
} from './BenchmarkFilterFields'
import type { EtfBenchmarkContent } from './housingBenchmarkContent'

export { ASSET_SELECT_CLASS }

export function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-10 rounded px-3 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        active
          ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

export function AssetTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={active
        ? 'min-h-10 rounded bg-card px-4 text-sm font-medium text-foreground shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
        : 'min-h-10 rounded px-4 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50'}
    >
      {children}
    </button>
  )
}

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
      <div
        role="group"
        aria-label="벤치마크 자산 유형"
        className="grid w-full grid-cols-2 rounded-md border border-border bg-muted/30 p-0.5 sm:w-[240px]"
      >
        <AssetTabButton active={activeAsset === 'ETF'} onClick={() => setActiveAsset('ETF')}>
          ETF
        </AssetTabButton>
        <AssetTabButton active={activeAsset === 'HOUSING'} onClick={() => setActiveAsset('HOUSING')}>
          아파트
        </AssetTabButton>
      </div>

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

          <fieldset>
            <legend className="text-xs font-medium text-muted-foreground">비교 기간</legend>
            <div className="mt-1 grid grid-cols-5 rounded-md border border-border p-0.5">
              {periods.map((item) => (
                <ToggleButton key={item.value} active={period === item.value} onClick={() => setPeriod(item.value)}>
                  {item.label}
                </ToggleButton>
              ))}
            </div>
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
          </fieldset>
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
