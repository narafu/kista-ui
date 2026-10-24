'use client'

import type { Account } from '@entities/account'
import type { EtfBenchmarkSymbol, HousingBenchmarkRegion } from '@entities/stats'
import type { Strategy } from '@entities/strategy'
import { useMeta } from '@entities/meta'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toSelectValue } from '@shared/lib/utils'
import { YearMonthSelect } from '@shared/ui/YearMonthSelect'
import { toMonthInput } from './model/benchmarkPeriods'
import type { EtfBenchmarkContent } from './housingBenchmarkContent'

// 목록이 비었을 때 안내용 비활성 항목 — disabled라 선택 불가이고 핸들러에서도 한 번 더 걸러낸다
const EMPTY_ITEM = '__empty'

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
  const { labelOf } = useMeta()
  const strategyItems = [
    { value: 'ALL', label: '전체' },
    { value: 'NONE', label: '없음 (벤치마크만 보기)' },
    ...strategies.map((strategy) => {
      const nickname = accountsById.get(strategy.accountId)?.nickname
      return { value: strategy.id, label: `${nickname ? `[${nickname}] ` : ''}${labelOf('strategyTypes', strategy.type)} · ${strategy.ticker}` }
    }),
  ]
  return (
    <div className="grid gap-1">
      <Label htmlFor="benchmark-strategy-select" className="text-xs font-medium text-muted-foreground">전략</Label>
      <Select items={strategyItems} value={toSelectValue(strategyItems, strategySelection)} onValueChange={(value) => { if (value && value !== EMPTY_ITEM) setStrategySelection(value) }}>
        <SelectTrigger id="benchmark-strategy-select" aria-label="전략" className="h-10 w-full">
          <SelectValue placeholder={strategies.length === 0 ? emptyListLabel(strategiesQuery, '전략 목록 불러오는 중', '전략 목록 조회 실패', '등록된 전략이 없습니다') : '전체'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">전체</SelectItem>
          <SelectItem value="NONE">없음 (벤치마크만 보기)</SelectItem>
          {strategies.length === 0 ? (
            <SelectItem value={EMPTY_ITEM} disabled>
              {emptyListLabel(strategiesQuery, '전략 목록 불러오는 중', '전략 목록 조회 실패', '등록된 전략이 없습니다')}
            </SelectItem>
          ) : null}
          {strategyItems.slice(2).map((item) => (
            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
  const etfItems = etfBenchmarks.map((item) => ({ value: item.symbol, label: `${item.label} (${item.fullName})` }))
  // code는 생성 타입상 optional — 코드 없는 지역은 선택지에서 뺀다
  const regionItems = regions.flatMap((region) => (region.code ? [{ value: region.code, label: region.name ?? region.code }] : []))
  return (
    <div className="grid gap-1">
      <Label htmlFor="benchmark-asset-select" className="text-xs font-medium text-muted-foreground">벤치마크 자산</Label>
      {activeAsset === 'ETF' ? (
        <Select
          items={etfItems}
          value={toSelectValue(etfItems, etfSymbol)}
          onValueChange={(value) => { if (value) handleEtfSymbolChange(value as EtfBenchmarkSymbol) }}
        >
          <SelectTrigger id="benchmark-asset-select" aria-label="벤치마크 자산" className="h-10 w-full">
            <SelectValue placeholder="자산 선택" />
          </SelectTrigger>
          <SelectContent>
            {etfBenchmarks.map((item) => (
              <SelectItem key={item.symbol} value={item.symbol}>
                {item.label} ({item.fullName})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Select
          items={regionItems}
          value={toSelectValue(regionItems, regionCode)}
          onValueChange={(value) => { if (value) setRegionCode(value) }}
          disabled={regions.length === 0}
        >
          <SelectTrigger id="benchmark-asset-select" aria-label="벤치마크 자산" className="h-10 w-full">
            <SelectValue placeholder={emptyListLabel(regionsQuery, '지역 목록 불러오는 중', '지역 목록 조회 실패', '선택할 지역이 없습니다')} />
          </SelectTrigger>
          <SelectContent>
            {regionItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
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
    // iOS 사파리의 date 입력은 고유 최소 폭이 있어 좁은 화면에서 둘을 한 줄에 두면 서로 겹친다 — 모바일은 세로로 쌓는다
    <div className="mt-2 grid grid-cols-1 gap-2 sm:flex sm:items-center">
      <Input
        type="date"
        aria-label="시작일"
        value={customFromDate}
        max={customToDate}
        onChange={(event) => setCustomFromDate(event.target.value)}
        className="h-10"
      />
      <span aria-hidden className="hidden shrink-0 text-xs text-muted-foreground sm:inline">~</span>
      <Input
        type="date"
        aria-label="종료일"
        value={customToDate}
        min={customFromDate}
        max={defaultTo}
        onChange={(event) => setCustomToDate(event.target.value)}
        className="h-10"
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
