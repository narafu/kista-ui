'use client'

import type { Account } from '@entities/account'
import type { EtfBenchmarkSymbol, HousingBenchmarkRegion } from '@entities/stats'
import type { Strategy } from '@entities/strategy'
import { YearMonthSelect } from '@shared/ui/YearMonthSelect'
import { toMonthInput } from './model/benchmarkPeriods'
import type { EtfBenchmarkContent } from './housingBenchmarkContent'

export const ASSET_SELECT_CLASS = 'min-h-10 w-full rounded-md border border-[var(--border-strong)] bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

const DATE_INPUT_CLASS = 'min-h-10 w-full rounded-md border border-[var(--border-strong)] bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

type QueryStatus = { isLoading: boolean; isError: boolean }

function emptyListLabel(status: QueryStatus, loading: string, error: string, empty: string) {
  return status.isLoading ? loading : status.isError ? error : empty
}

export function StrategySelect({
  strategies,
  strategiesQuery,
  accountsById,
  strategySelection,
  setStrategySelection,
}: {
  strategies: Strategy[]
  strategiesQuery: QueryStatus
  accountsById: Map<string, Account>
  strategySelection: string
  setStrategySelection: (value: string) => void
}) {
  return (
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
            {emptyListLabel(strategiesQuery, '전략 목록 불러오는 중', '전략 목록 조회 실패', '등록된 전략이 없습니다')}
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
  )
}

export function BenchmarkAssetSelect({
  activeAsset,
  etfSymbol,
  handleEtfSymbolChange,
  etfBenchmarks,
  regionCode,
  setRegionCode,
  regions,
  regionsQuery,
}: {
  activeAsset: 'ETF' | 'HOUSING'
  etfSymbol: EtfBenchmarkSymbol
  handleEtfSymbolChange: (symbol: EtfBenchmarkSymbol) => void
  etfBenchmarks: (EtfBenchmarkContent & { symbol: EtfBenchmarkSymbol })[]
  regionCode: string
  setRegionCode: (regionCode: string) => void
  regions: HousingBenchmarkRegion[]
  regionsQuery: QueryStatus
}) {
  return (
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
              {emptyListLabel(regionsQuery, '지역 목록 불러오는 중', '지역 목록 조회 실패', '선택할 지역이 없습니다')}
            </option>
          ) : null}
          {regions.map((region) => (
            <option key={region.code} value={region.code}>{region.name}</option>
          ))}
        </select>
      )}
    </label>
  )
}

export function CustomDateRange({
  customFromDate,
  setCustomFromDate,
  customToDate,
  setCustomToDate,
  defaultTo,
}: {
  customFromDate: string
  setCustomFromDate: (value: string) => void
  customToDate: string
  setCustomToDate: (value: string) => void
  defaultTo: string
}) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        type="date"
        aria-label="시작일"
        value={customFromDate}
        max={customToDate}
        onChange={(event) => setCustomFromDate(event.target.value)}
        className={DATE_INPUT_CLASS}
      />
      <span className="shrink-0 text-xs text-muted-foreground">~</span>
      <input
        type="date"
        aria-label="종료일"
        value={customToDate}
        min={customFromDate}
        max={defaultTo}
        onChange={(event) => setCustomToDate(event.target.value)}
        className={DATE_INPUT_CLASS}
      />
    </div>
  )
}

export function CustomMonthRange({
  customFromMonth,
  setCustomFromMonth,
  customToMonth,
  setCustomToMonth,
  defaultTo,
}: {
  customFromMonth: string
  setCustomFromMonth: (value: string) => void
  customToMonth: string
  setCustomToMonth: (value: string) => void
  defaultTo: string
}) {
  // 네이티브 <input type="month">은 데스크탑 사파리가 피커를 지원하지 않아 YearMonthSelect로 대체한다.
  // 월 단위 min/max 교차 제약은 컴포넌트가 연 단위만 지원하므로 onValueChange에서 clamp한다.
  return (
    <div className="mt-2 flex items-center gap-2">
      <YearMonthSelect
        label="시작월"
        value={customFromMonth}
        today={defaultTo}
        maxYear={Number(customToMonth.slice(0, 4))}
        onValueChange={(month) => setCustomFromMonth(month > customToMonth ? customToMonth : month)}
        className="h-10 w-full"
      />
      <span className="shrink-0 text-xs text-muted-foreground">~</span>
      <YearMonthSelect
        label="종료월"
        value={customToMonth}
        today={defaultTo}
        minYear={Number(customFromMonth.slice(0, 4))}
        maxYear={Number(toMonthInput(defaultTo).slice(0, 4))}
        onValueChange={(month) => {
          const max = toMonthInput(defaultTo)
          setCustomToMonth(month < customFromMonth ? customFromMonth : month > max ? max : month)
        }}
        className="h-10 w-full"
      />
    </div>
  )
}
