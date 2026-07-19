'use client'

import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useHousingBenchmarkQuery } from '@entities/stats'
import type { HousingBenchmarkParams } from '@entities/stats'
import { useAllStrategiesQuery } from '@entities/strategy'
import { EmptyState } from '@shared/ui/EmptyState'
import { cn } from '@shared/lib/utils'
import { HousingBenchmarkChart } from './HousingBenchmarkChart'
import { HousingBenchmarkSummary } from './HousingBenchmarkSummary'
import { HousingBenchmarkInfo } from './HousingBenchmarkInfo'
import { HOUSING_QUINTILES, type HousingQuintile } from './housingBenchmarkContent'
import { SectionError } from './SectionError'

type Scope = HousingBenchmarkParams['scope']
type Period = '1Y' | '3Y' | '5Y' | 'ALL'

interface Props {
  enabled: boolean
  defaultTo: string
}

const PERIODS: { value: Period; label: string; years?: number }[] = [
  { value: '1Y', label: '1년', years: 1 },
  { value: '3Y', label: '3년', years: 3 },
  { value: '5Y', label: '5년', years: 5 },
  { value: 'ALL', label: '전체' },
]

function subtractYears(date: string, years: number) {
  const [year, month, day] = date.split('-').map(Number)
  const targetYear = year - years
  const isLeapYear = targetYear % 4 === 0 && (targetYear % 100 !== 0 || targetYear % 400 === 0)
  const daysInMonth = month === 2
    ? (isLeapYear ? 29 : 28)
    : [4, 6, 9, 11].includes(month) ? 30 : 31
  const targetDay = Math.min(day, daysInMonth)

  return `${targetYear}-${String(month).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
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

function BenchmarkUpdating() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="새 조건의 벤치마크 비교를 불러오는 중"
      className="flex min-h-[240px] items-center justify-center border-y border-border text-sm text-muted-foreground"
    >
      새 조건의 벤치마크 비교를 불러오는 중
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
    return '투자 기록과 서울 아파트 데이터가 겹치는 기간이 부족합니다.'
  }
  if (reason === 'NO_INVESTMENT_DATA') return '선택한 기간에 전략 운용 기록이 없습니다.'
  return '비교할 수 있는 데이터가 충분하지 않습니다.'
}

function isHousingQuintile(value: number | undefined): value is HousingQuintile {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5
}

export function HousingBenchmarkComparison({ enabled, defaultTo }: Props) {
  const [scope, setScope] = useState<Scope>('PORTFOLIO')
  const [selectedStrategyId, setSelectedStrategyId] = useState('')
  const [quintile, setQuintile] = useState<HousingQuintile>(3)
  const [period, setPeriod] = useState<Period>('5Y')

  const strategiesQuery = useAllStrategiesQuery()
  const strategies = strategiesQuery.data ?? []
  const effectiveStrategyId = selectedStrategyId || strategies[0]?.id
  const isStrategyScope = scope === 'STRATEGY'
  const strategyListFailed = isStrategyScope && strategiesQuery.isError
  const strategyListLoading = isStrategyScope
    && (strategiesQuery.isLoading || (!strategiesQuery.isError && strategiesQuery.data == null))
  const strategyListEmpty = isStrategyScope
    && !strategyListLoading
    && !strategyListFailed
    && strategiesQuery.data?.length === 0
  const selectedPeriod = PERIODS.find((item) => item.value === period)
  const from = selectedPeriod?.years ? subtractYears(defaultTo, selectedPeriod.years) : undefined
  const canQuery = scope === 'PORTFOLIO' || Boolean(effectiveStrategyId)
  const params: HousingBenchmarkParams = {
    scope,
    ...(scope === 'STRATEGY' && effectiveStrategyId ? { strategyId: effectiveStrategyId } : {}),
    quintile,
    ...(from ? { from } : {}),
    to: defaultTo,
  }
  const query = useHousingBenchmarkQuery(params, enabled && canQuery)
  const data = query.data
  const responseQuintile = data?.benchmark?.quintile
  const displayedQuintile = isHousingQuintile(responseQuintile) ? responseQuintile : quintile
  const benchmarkLabel = data?.benchmark?.label ?? `서울 아파트 ${displayedQuintile}분위`
  const responseScope = data?.scope === 'STRATEGY' ? 'STRATEGY' : 'PORTFOLIO'
  const investmentLabel = responseScope === 'PORTFOLIO'
    ? '전체 포트폴리오'
    : data?.strategy?.type && data.strategy.ticker
      ? `${data.strategy.type} · ${data.strategy.ticker}`
      : '개별 전략'

  return (
    <div className="flex flex-col gap-4">
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
            서울 아파트 분위
            <select
              aria-label="서울 아파트 분위"
              value={quintile}
              onChange={(event) => setQuintile(Number(event.target.value) as HousingQuintile)}
              className="min-h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {HOUSING_QUINTILES.map((item) => (
                <option key={item.quintile} value={item.quintile}>{item.label}</option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend className="text-xs font-medium text-muted-foreground">비교 기간</legend>
            <div className="mt-1 grid grid-cols-4 rounded-md border border-border p-0.5">
              {PERIODS.map((item) => (
                <ToggleButton key={item.value} active={period === item.value} onClick={() => setPeriod(item.value)}>
                  {item.label}
                </ToggleButton>
              ))}
            </div>
          </fieldset>
        </div>
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
      ) : !canQuery ? null : query.isPlaceholderData ? (
        <BenchmarkUpdating />
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
          />
          <HousingBenchmarkChart
            points={data.points ?? []}
            investmentLabel={investmentLabel}
            benchmark={data.benchmark ?? { label: benchmarkLabel }}
          />
          <HousingBenchmarkInfo
            quintile={displayedQuintile}
            benchmark={data.benchmark}
            currentExchangeRate={data.currentExchangeRate}
            notice={data.quality?.notice}
          />
        </>
      ) : data ? (
        <>
          <EmptyState message={emptyMessage(data.emptyReason)} />
          <HousingBenchmarkInfo
            quintile={displayedQuintile}
            benchmark={data.benchmark}
            currentExchangeRate={data.currentExchangeRate}
            notice={data.quality?.notice}
          />
        </>
      ) : null}
    </div>
  )
}
