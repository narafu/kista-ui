'use client'

import { useState } from 'react'
import {
  useStatsSummaryQuery,
  useEquityCurveQuery,
} from '@entities/stats'
import type { EquityCurve, StatsSummary } from '@entities/stats'
import { EmptyState } from '@shared/ui/EmptyState'
import { normalizeEquityCurve } from './lib/normalizeEquityCurve'
import { StatsKpiRow } from './StatsKpiRow'
import { EquityCurveChart } from './EquityCurveChart'
import { StrategyTypeComparison } from './StrategyTypeComparison'
import { CyclePerformanceList } from './CyclePerformanceList'
import { StrategyTypeFilterToggle } from './StrategyTypeFilterToggle'
import { SectionError } from './SectionError'
import { HousingBenchmarkComparison } from './HousingBenchmarkComparison'

export type RangeKey = '1M' | '3M' | '6M' | '1Y' | 'ALL'

const RANGE_DAYS: Record<Exclude<RangeKey, 'ALL'>, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
}

/** range 프리셋 → equity-curve API의 from 파라미터. 'ALL'은 제한 없음(undefined). */
function rangeToFrom(range: RangeKey, to: string): string | undefined {
  if (range === 'ALL') return undefined
  const toDate = new Date(to)
  toDate.setDate(toDate.getDate() - RANGE_DAYS[range])
  return toDate.toISOString().slice(0, 10)
}

interface Props {
  initialSummary?: StatsSummary
  initialCurve?: EquityCurve
  defaultFrom: string
  defaultTo: string
}

export function StatsOverview({ initialSummary, initialCurve, defaultFrom, defaultTo }: Props) {
  const [range, setRange] = useState<RangeKey>('3M')
  const [strategyTypeFilter, setStrategyTypeFilter] = useState<string | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<'OPERATIONS' | 'BENCHMARK'>('OPERATIONS')
  const [hasOpenedBenchmark, setHasOpenedBenchmark] = useState(false)

  const summaryQuery = useStatsSummaryQuery(initialSummary)

  // 초기 상태(range=3M)일 때만 서버가 내려준 초기 curve를 그대로 사용한다.
  // 그 외에는 defaultFrom 대신 range에서 근사 계산한 from을 사용한다.
  const isInitialParams = range === '3M'
  const from = isInitialParams ? defaultFrom : rangeToFrom(range, defaultTo)
  const curveQuery = useEquityCurveQuery(
    { from, to: defaultTo, type: strategyTypeFilter },
    isInitialParams && strategyTypeFilter === undefined ? initialCurve : undefined,
  )

  const summary = summaryQuery.data
  const curve = curveQuery.data
  const summaryFailed = summaryQuery.isError && !summary
  const curveFailed = curveQuery.isError && !curve

  const rows = curve ? normalizeEquityCurve(curve.points) : []
  const byType = summary?.byType ?? []

  const isEmpty = !summaryFailed && !curveFailed && byType.length === 0 && rows.length === 0

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label="통계 보기"
        className="grid w-full grid-cols-2 rounded-md border border-border bg-muted/30 p-0.5 sm:w-[320px]"
      >
        <button
          type="button"
          aria-pressed={activeTab === 'OPERATIONS'}
          onClick={() => setActiveTab('OPERATIONS')}
          className={activeTab === 'OPERATIONS'
            ? 'min-h-10 rounded bg-card px-3 text-sm font-medium text-foreground shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
            : 'min-h-10 rounded px-3 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50'}
        >
          운용 통계
        </button>
        <button
          type="button"
          aria-pressed={activeTab === 'BENCHMARK'}
          onClick={() => {
            setHasOpenedBenchmark(true)
            setActiveTab('BENCHMARK')
          }}
          className={activeTab === 'BENCHMARK'
            ? 'min-h-10 rounded bg-card px-3 text-sm font-medium text-foreground shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
            : 'min-h-10 rounded px-3 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50'}
        >
          벤치마크 비교
        </button>
      </div>

      <div hidden={activeTab !== 'OPERATIONS'} className="flex flex-col gap-4">
        {isEmpty ? (
          <EmptyState message="아직 기록된 사이클이 없습니다 — 전략이 매매를 시작하면 통계가 쌓입니다." />
        ) : (
          <>
            {summaryFailed ? (
              <SectionError />
            ) : summary ? (
              <StatsKpiRow summary={summary} />
            ) : null}

            {curveFailed ? (
              <div className="flex flex-col gap-3">
                <SectionError />
                <div className="flex justify-end">
                  <StrategyTypeFilterToggle
                    strategyTypes={byType}
                    strategyTypeFilter={strategyTypeFilter}
                    onStrategyTypeFilterChange={setStrategyTypeFilter}
                  />
                </div>
              </div>
            ) : (
              <EquityCurveChart
                rows={rows}
                range={range}
                onRangeChange={setRange}
                strategyTypes={byType}
                strategyTypeFilter={strategyTypeFilter}
                onStrategyTypeFilterChange={setStrategyTypeFilter}
              />
            )}

            <CyclePerformanceList typeFilter={strategyTypeFilter} />

            {summaryFailed ? null : <StrategyTypeComparison byType={byType} />}
          </>
        )}
      </div>

      {hasOpenedBenchmark ? (
        <div hidden={activeTab !== 'BENCHMARK'}>
          <HousingBenchmarkComparison enabled={activeTab === 'BENCHMARK'} defaultTo={defaultTo} />
        </div>
      ) : null}
    </div>
  )
}
