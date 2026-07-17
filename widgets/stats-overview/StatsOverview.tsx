'use client'

import { useState } from 'react'
import {
  useStatsSummaryQuery,
  useEquityCurveQuery,
} from '@entities/stats'
import type { BenchmarkSymbol, EquityCurve, StatsSummary } from '@entities/stats'
import { ErrorDisplay } from '@widgets/error-display'
import { EmptyState } from '@shared/ui/EmptyState'
import { normalizeEquityCurve } from './lib/normalizeEquityCurve'
import { StatsKpiRow } from './StatsKpiRow'
import { EquityCurveChart } from './EquityCurveChart'
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
  const [benchmark, setBenchmark] = useState<BenchmarkSymbol>('SPY')

  const summaryQuery = useStatsSummaryQuery(initialSummary)

  // 초기 상태(range=3M, benchmark=SPY)일 때만 서버가 내려준 초기 curve를 그대로 사용한다.
  // 그 외에는 defaultFrom 대신 range에서 근사 계산한 from을 사용한다.
  const isInitialParams = range === '3M' && benchmark === 'SPY'
  const from = isInitialParams ? defaultFrom : rangeToFrom(range, defaultTo)
  const curveQuery = useEquityCurveQuery(
    { from, to: defaultTo, benchmark },
    isInitialParams ? initialCurve : undefined,
  )

  const summary = summaryQuery.data
  const curve = curveQuery.data
  const summaryFailed = summaryQuery.isError && !summary
  const curveFailed = curveQuery.isError && !curve

  const rows = curve ? normalizeEquityCurve(curve.points, curve.benchmark) : []
  const byType = summary?.byType ?? []

  const isEmpty = !summaryFailed && !curveFailed && byType.length === 0 && rows.length === 0

  if (isEmpty) {
    return (
      <EmptyState message="아직 기록된 사이클이 없습니다 — 전략이 매매를 시작하면 통계가 쌓입니다." />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {summaryFailed ? (
        <ErrorDisplay standalone={false} />
      ) : summary ? (
        <StatsKpiRow summary={summary} rows={rows} range={range} benchmark={benchmark} />
      ) : null}

      {curveFailed ? (
        <ErrorDisplay standalone={false} />
      ) : (
        <EquityCurveChart
          rows={rows}
          range={range}
          onRangeChange={setRange}
          benchmark={benchmark}
          onBenchmarkChange={setBenchmark}
        />
      )}

      {summaryFailed ? (
        <ErrorDisplay standalone={false} />
      ) : (
        <StrategyTypeComparison byType={byType} />
      )}

      <CyclePerformanceList byType={byType} />
    </div>
  )
}
