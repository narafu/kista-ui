'use client'

import type { Account } from '@entities/account'
import type { EtfBenchmarkSymbol, HousingBenchmarkRegion } from '@entities/stats'
import type { Strategy } from '@entities/strategy'
import { cn } from '@shared/lib/utils'
import { toMonthInput, type Period } from './model/benchmarkPeriods'
import type { EtfBenchmarkContent } from './housingBenchmarkContent'

export const ASSET_SELECT_CLASS = 'min-h-10 w-full rounded-md border border-[var(--border-strong)] bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

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
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            전략
            <select
              aria-label="전략"
              value={strategySelection}
              onChange={(event) => setStrategySelection(event.target.value)}
              className={ASSET_SELECT_CLASS}
            >
              <option value="ALL">전체</option>
              <option value="NONE">없음</option>
              {strategies.length === 0 ? (
                <option value="" disabled>
                  {strategiesQuery.isLoading
                    ? '전략 목록 불러오는 중'
                    : strategiesQuery.isError
                      ? '전략 목록 조회 실패'
                      : '등록된 전략이 없습니다'}
                </option>
              ) : null}
              {strategies.map((strategy) => {
                const nickname = accountsById.get(strategy.accountId)?.nickname
                return (
                  <option key={strategy.id} value={strategy.id}>
                    {nickname ? `[${nickname}] ` : ''}{strategy.type} · {strategy.ticker}
                  </option>
                )
              })}
            </select>
          </label>

          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            벤치마크 자산
            {activeAsset === 'ETF' ? (
              <select
                aria-label="벤치마크 자산"
                value={etfSymbol}
                onChange={(event) => handleEtfSymbolChange(event.target.value as EtfBenchmarkSymbol)}
                className={ASSET_SELECT_CLASS}
              >
                {etfBenchmarks.map((item) => (
                  <option key={item.symbol} value={item.symbol}>
                    {item.label} ({item.fullName})
                  </option>
                ))}
              </select>
            ) : (
              <select
                aria-label="벤치마크 자산"
                value={regionCode}
                onChange={(event) => setRegionCode(event.target.value)}
                disabled={regions.length === 0}
                className={ASSET_SELECT_CLASS}
              >
                {regions.length === 0 ? (
                  <option value="">
                    {regionsQuery.isLoading
                      ? '지역 목록 불러오는 중'
                      : regionsQuery.isError
                        ? '지역 목록 조회 실패'
                        : '선택할 지역이 없습니다'}
                  </option>
                ) : null}
                {regions.map((region) => (
                  <option key={region.code} value={region.code}>{region.name}</option>
                ))}
              </select>
            )}
          </label>

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
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="date"
                  aria-label="시작일"
                  value={customFromDate}
                  max={customToDate}
                  onChange={(event) => setCustomFromDate(event.target.value)}
                  className="min-h-10 w-full rounded-md border border-[var(--border-strong)] bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="shrink-0 text-xs text-muted-foreground">~</span>
                <input
                  type="date"
                  aria-label="종료일"
                  value={customToDate}
                  min={customFromDate}
                  max={defaultTo}
                  onChange={(event) => setCustomToDate(event.target.value)}
                  className="min-h-10 w-full rounded-md border border-[var(--border-strong)] bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            ) : isCustomPeriod ? (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="month"
                  aria-label="시작월"
                  value={customFromMonth}
                  max={customToMonth}
                  onChange={(event) => setCustomFromMonth(event.target.value)}
                  className="min-h-10 w-full rounded-md border border-[var(--border-strong)] bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="shrink-0 text-xs text-muted-foreground">~</span>
                <input
                  type="month"
                  aria-label="종료월"
                  value={customToMonth}
                  min={customFromMonth}
                  max={toMonthInput(defaultTo)}
                  onChange={(event) => setCustomToMonth(event.target.value)}
                  className="min-h-10 w-full rounded-md border border-[var(--border-strong)] bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
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
