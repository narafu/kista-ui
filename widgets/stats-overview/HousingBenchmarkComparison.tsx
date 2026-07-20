'use client'

import { useCallback, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useHousingBenchmarkQuery } from '@entities/stats'
import type { EtfBenchmarkSymbol, HousingBenchmark, HousingBenchmarkParams, HousingBenchmarkRegion } from '@entities/stats'
import { useAllStrategiesQuery } from '@entities/strategy'
import { EmptyState } from '@shared/ui/EmptyState'
import { cn } from '@shared/lib/utils'
import { HousingBenchmarkChart } from './HousingBenchmarkChart'
import { HousingBenchmarkSummary } from './HousingBenchmarkSummary'
import { HousingBenchmarkInfo } from './HousingBenchmarkInfo'
import { HousingBenchmarkQuintileTrendChart } from './HousingBenchmarkQuintileTrendChart'
import { HousingBenchmarkRegionQuintileInfo } from './HousingBenchmarkRegionQuintileInfo'
import {
  DEFAULT_HOUSING_REGION_NAME,
  ETF_BENCHMARKS,
  HOUSING_QUINTILES,
  type HousingQuintile,
} from './housingBenchmarkContent'
import { SectionError } from './SectionError'

type Scope = HousingBenchmarkParams['scope']
type Period = '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL' | 'CUSTOM'

type BenchmarkSelection =
  | { type: 'HOUSING'; quintile: HousingQuintile }
  | { type: 'ETF'; symbol: EtfBenchmarkSymbol }

interface Props {
  enabled: boolean
  defaultTo: string
}

// 아파트는 월별 데이터라 연 단위, ETF는 일별 데이터라 개월 단위 기간이 자연스럽다 — 자산 탭별로 목록을 분리한다
const HOUSING_PERIODS: { value: Period; label: string; months?: number }[] = [
  { value: '1Y', label: '1년', months: 12 },
  { value: '3Y', label: '3년', months: 36 },
  { value: '5Y', label: '5년', months: 60 },
  { value: 'ALL', label: '전체' },
  { value: 'CUSTOM', label: '직접' },
]

const ETF_PERIODS: { value: Period; label: string; months?: number }[] = [
  { value: '3M', label: '3개월', months: 3 },
  { value: '6M', label: '6개월', months: 6 },
  { value: '1Y', label: '1년', months: 12 },
  { value: 'ALL', label: '전체' },
  { value: 'CUSTOM', label: '직접' },
]

function toMonthInput(date: string) {
  return date.slice(0, 7)
}

function fromMonthInput(month: string) {
  return `${month}-01`
}

function subtractMonths(date: string, months: number) {
  const [year, month, day] = date.split('-').map(Number)
  const totalMonths = year * 12 + (month - 1) - months
  const targetYear = Math.floor(totalMonths / 12)
  const targetMonth = (totalMonths % 12) + 1
  const isLeapYear = targetYear % 4 === 0 && (targetYear % 100 !== 0 || targetYear % 400 === 0)
  const daysInMonth = targetMonth === 2
    ? (isLeapYear ? 29 : 28)
    : [4, 6, 9, 11].includes(targetMonth) ? 30 : 31
  const targetDay = Math.min(day, daysInMonth)

  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
}

function ToggleButton({
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

function BenchmarkLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-4"
      aria-label="벤치마크 비교 불러오는 중"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Skeleton className="col-span-2 h-28 sm:col-span-1" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton data-testid="housing-benchmark-chart-skeleton" className="min-h-[240px] sm:min-h-[300px]" />
    </div>
  )
}

function StrategyListLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="전략 목록 불러오는 중"
      className="rounded-[var(--r-lg)] border border-border bg-card p-5"
    >
      <Skeleton className="h-20 w-full" />
    </div>
  )
}

function emptyMessage(reason: string | null | undefined) {
  if (reason === 'INSUFFICIENT_OVERLAP' || reason === 'INSUFFICIENT_COMMON_MONTHS') {
    return '투자 기록과 벤치마크 데이터가 겹치는 기간이 부족합니다. (최소 2개월치 데이터 필요)'
  }
  if (reason === 'NO_INVESTMENT_DATA') return '선택한 기간에 전략 운용 기록이 없습니다.'
  return '비교할 수 있는 데이터가 충분하지 않습니다.'
}

function isHousingQuintile(value: number | null | undefined): value is HousingQuintile {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5
}

const ASSET_SELECT_CLASS = 'min-h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

function AssetTabButton({
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

export function HousingBenchmarkComparison({ enabled, defaultTo }: Props) {
  const [scope, setScope] = useState<Scope>('PORTFOLIO')
  const [selectedStrategyId, setSelectedStrategyId] = useState('')
  const [activeAsset, setActiveAsset] = useState<'ETF' | 'HOUSING'>('HOUSING')
  const [quintile, setQuintile] = useState<HousingQuintile>(3)
  const [etfSymbol, setEtfSymbol] = useState<EtfBenchmarkSymbol>(ETF_BENCHMARKS[0].symbol)
  const selection: BenchmarkSelection = activeAsset === 'ETF' ? { type: 'ETF', symbol: etfSymbol } : { type: 'HOUSING', quintile }
  const [housingPeriod, setHousingPeriod] = useState<Period>('1Y')
  const [etfPeriod, setEtfPeriod] = useState<Period>('1Y')
  const period = activeAsset === 'ETF' ? etfPeriod : housingPeriod
  const setPeriod = activeAsset === 'ETF' ? setEtfPeriod : setHousingPeriod
  const periods = activeAsset === 'ETF' ? ETF_PERIODS : HOUSING_PERIODS
  const [customFromMonth, setCustomFromMonth] = useState(() => toMonthInput(subtractMonths(defaultTo, 12)))
  const [customToMonth, setCustomToMonth] = useState(() => toMonthInput(defaultTo))
  const [customFromDate, setCustomFromDate] = useState(() => subtractMonths(defaultTo, 3))
  const [customToDate, setCustomToDate] = useState(() => defaultTo)
  const [trendRegionName, setTrendRegionName] = useState<string>(DEFAULT_HOUSING_REGION_NAME)
  const handleTrendRegionChange = useCallback(
    (region: HousingBenchmarkRegion) => setTrendRegionName(region.name ?? DEFAULT_HOUSING_REGION_NAME),
    [],
  )

  const isStrategyScope = scope === 'STRATEGY'
  // 개별 전략으로 전환했을 때만 전략 목록을 조회 — 전체 포트폴리오 범위에서는 불필요한 요청을 만들지 않는다
  const strategiesQuery = useAllStrategiesQuery(undefined, { enabled: enabled && isStrategyScope })
  const strategies = strategiesQuery.data ?? []
  const effectiveStrategyId = selectedStrategyId || strategies[0]?.id
  const hasStrategyList = strategiesQuery.data != null
  const strategyListFailed = isStrategyScope && !hasStrategyList && strategiesQuery.isError
  const strategyListLoading = isStrategyScope
    && !hasStrategyList
    && !strategiesQuery.isError
  const strategyListEmpty = isStrategyScope
    && hasStrategyList
    && strategiesQuery.data?.length === 0
  const selectedPeriod = periods.find((item) => item.value === period)
  const isCustomPeriod = period === 'CUSTOM'
  const from = isCustomPeriod
    ? (activeAsset === 'ETF'
        ? (customFromDate || undefined)
        : (customFromMonth ? fromMonthInput(customFromMonth) : undefined))
    : selectedPeriod?.months ? subtractMonths(defaultTo, selectedPeriod.months) : undefined
  const to = isCustomPeriod
    ? (activeAsset === 'ETF' ? (customToDate || defaultTo) : (customToMonth ? fromMonthInput(customToMonth) : defaultTo))
    : defaultTo
  const canQuery = scope === 'PORTFOLIO' || Boolean(effectiveStrategyId)
  const strategyIdParam = scope === 'STRATEGY' && effectiveStrategyId ? { strategyId: effectiveStrategyId } : {}
  const params: HousingBenchmarkParams = selection.type === 'HOUSING'
    ? {
        scope,
        ...strategyIdParam,
        benchmarkType: 'HOUSING',
        quintile: selection.quintile,
        ...(from ? { from } : {}),
        to,
      }
    : {
        scope,
        ...strategyIdParam,
        benchmarkType: 'ETF',
        symbol: selection.symbol,
        ...(from ? { from } : {}),
        to,
      }
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
        <div className={cn(
          'grid gap-4 sm:grid-cols-2 xl:items-end',
          scope === 'STRATEGY' ? 'xl:grid-cols-4' : 'xl:grid-cols-3',
        )}>
          <fieldset>
            <legend className="text-xs font-medium text-muted-foreground">투자 범위</legend>
            <div className="mt-1 grid grid-cols-2 rounded-md border border-border p-0.5">
              <ToggleButton active={scope === 'PORTFOLIO'} onClick={() => setScope('PORTFOLIO')}>
                전체 포트폴리오
              </ToggleButton>
              <ToggleButton active={scope === 'STRATEGY'} onClick={() => setScope('STRATEGY')}>
                개별 전략
              </ToggleButton>
            </div>
          </fieldset>

          {scope === 'STRATEGY' ? (
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              전략
              <select
                aria-label="전략"
                value={effectiveStrategyId ?? ''}
                onChange={(event) => setSelectedStrategyId(event.target.value)}
                disabled={strategies.length === 0}
                className="min-h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {strategies.length === 0 ? (
                  <option value="">
                    {strategiesQuery.isLoading
                      ? '전략 목록 불러오는 중'
                      : strategiesQuery.isError
                        ? '전략 목록 조회 실패'
                        : '선택할 전략이 없습니다'}
                  </option>
                ) : null}
                {strategies.map((strategy) => (
                  <option key={strategy.id} value={strategy.id}>
                    {strategy.type} · {strategy.ticker}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            벤치마크 자산
            {activeAsset === 'ETF' ? (
              <select
                aria-label="벤치마크 자산"
                value={etfSymbol}
                onChange={(event) => setEtfSymbol(event.target.value as EtfBenchmarkSymbol)}
                className={ASSET_SELECT_CLASS}
              >
                {ETF_BENCHMARKS.map((item) => (
                  <option key={item.symbol} value={item.symbol}>
                    {item.label} ({item.fullName})
                  </option>
                ))}
              </select>
            ) : (
              <select
                aria-label="벤치마크 자산"
                value={quintile}
                onChange={(event) => setQuintile(Number(event.target.value) as HousingQuintile)}
                className={ASSET_SELECT_CLASS}
              >
                {HOUSING_QUINTILES.map((item) => (
                  <option key={item.quintile} value={item.quintile}>
                    {item.label} ({item.rangeLabel})
                  </option>
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
                  className="min-h-10 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="shrink-0 text-xs text-muted-foreground">~</span>
                <input
                  type="date"
                  aria-label="종료일"
                  value={customToDate}
                  min={customFromDate}
                  max={defaultTo}
                  onChange={(event) => setCustomToDate(event.target.value)}
                  className="min-h-10 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="min-h-10 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="shrink-0 text-xs text-muted-foreground">~</span>
                <input
                  type="month"
                  aria-label="종료월"
                  value={customToMonth}
                  min={customFromMonth}
                  max={toMonthInput(defaultTo)}
                  onChange={(event) => setCustomToMonth(event.target.value)}
                  className="min-h-10 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            ) : null}
          </fieldset>
        </div>
        {query.isFetching && query.isPlaceholderData ? (
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
        <EmptyState message={emptyMessage(data.emptyReason)} />
      ) : null}

      {/* ETF 탭에서만 표시되는 위험 안내 — 부동산(서울 분위) 안내는 아래 아파트 탭의 "가격 추이" 비교지역 선택과 연동된 안내로 이동 */}
      {activeAsset === 'ETF' ? (
        <HousingBenchmarkInfo benchmark={data?.benchmark ?? fallbackBenchmark} notice={data?.quality?.notice} />
      ) : null}

      {/* 아파트 탭에서만 표시 — 사용자 투자 데이터와 무관하게 항상 나오는 5분위 원본 시계열, 위 비교 결과와 독립적, 상단 "비교 기간" 토글과 동일한 from/to 사용 */}
      {activeAsset === 'HOUSING' ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">참고 · 아파트 시세 원본 데이터</p>
          <div className="flex flex-col gap-4">
            <HousingBenchmarkQuintileTrendChart enabled={enabled} from={from} to={to} onRegionChange={handleTrendRegionChange} />
            <HousingBenchmarkRegionQuintileInfo regionName={trendRegionName} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
