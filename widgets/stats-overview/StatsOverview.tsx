'use client'

import { useState } from 'react'
import {
  useStatsSummaryQuery,
  useEquityCurveQuery,
} from '@entities/stats'
import { EmptyState } from '@shared/ui/EmptyState'
import { CardSkeleton } from '@shared/ui/CardSkeleton'
import { normalizeEquityCurve } from './lib/normalizeEquityCurve'
import { SummarySection, CurveSection } from './StatsSections'
import { StrategyTypeComparison } from './StrategyTypeComparison'
import { CyclePerformanceList } from './CyclePerformanceList'

export type RangeKey = '1M' | '3M' | '6M' | '1Y' | 'ALL'

const RANGE_DAYS: Record<Exclude<RangeKey, 'ALL'>, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
}

/** range 프리셋 → equity-curve API의 from 파라미터. 'ALL'은 제한 없음(undefined). */
// to(서버가 정한 KST 오늘)를 기준으로 UTC 연산 — 로컬 Date 연산은 서머타임 시간대에서 하루 어긋날 수 있다
function rangeToFrom(range: RangeKey, to: string): string | undefined {
  if (range === 'ALL') return undefined
  const date = new Date(`${to}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - RANGE_DAYS[range])
  return date.toISOString().slice(0, 10)
}

interface Props {
  defaultFrom: string
  defaultTo: string
}

export function StatsOverview({ defaultFrom, defaultTo }: Props) {
  const [range, setRange] = useState<RangeKey>('3M')
  const [strategyTypeFilter, setStrategyTypeFilter] = useState<string | undefined>(undefined)

  const summaryQuery = useStatsSummaryQuery()

  // range=3M 초기 상태는 서버 prefetch key(defaultFrom/defaultTo)와 일치해야 hydration이 적중한다.
  const from = range === '3M' ? defaultFrom : rangeToFrom(range, defaultTo)
  const curveQuery = useEquityCurveQuery({ from, to: defaultTo, type: strategyTypeFilter })

  if (summaryQuery.isPending || curveQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <CardSkeleton className="h-24" />
        <CardSkeleton className="h-72" />
      </div>
    )
  }

  const summary = summaryQuery.data
  const curve = curveQuery.data
  const summaryFailed = summaryQuery.isError && !summary
  const curveFailed = curveQuery.isError && !curve

  const rows = curve ? normalizeEquityCurve(curve.points) : []
  const byType = summary?.byType ?? []

  const isEmpty = !summaryFailed && !curveFailed && byType.length === 0 && rows.length === 0

  return (
    <div className="flex flex-col gap-4">
      {isEmpty ? (
        <>
          <EmptyState
            message={'아직 집계된 통계가 없습니다.\n모의계좌는 집계에서 제외되며, 전략이 매매를 시작하면 통계가 쌓입니다.'}
            className="whitespace-pre-line"
          />
          {/* 요약·추이는 모의계좌를 빼고 집계하지만 사이클 목록은 포함하므로, 모의계좌 사이클만 있어도 목록은 보여준다 */}
          <CyclePerformanceList typeFilter={strategyTypeFilter} />
        </>
      ) : (
        <>
          <SummarySection failed={summaryFailed} summary={summary} />

          <CurveSection
            failed={curveFailed}
            rows={rows}
            stale={curveQuery.isPlaceholderData}
            range={range}
            onRangeChange={setRange}
            strategyTypes={byType}
            strategyTypeFilter={strategyTypeFilter}
            onStrategyTypeFilterChange={setStrategyTypeFilter}
          />

          <CyclePerformanceList typeFilter={strategyTypeFilter} />

          {summaryFailed ? null : <StrategyTypeComparison byType={byType} />}
        </>
      )}
    </div>
  )
}
