import { SectionError } from '@shared/ui/SectionError'
import type { StatsSummary, StrategyTypeStats } from '@entities/stats'
import type { NormalizedRow } from './lib/normalizeEquityCurve'
import type { RangeKey } from './StatsOverview'
import { StatsKpiRow } from './StatsKpiRow'
import { EquityCurveChart } from './EquityCurveChart'
import { StrategyTypeFilterToggle } from './StrategyTypeFilterToggle'

export function SummarySection({ failed, summary }: { failed: boolean; summary?: StatsSummary }) {
  if (failed) return <SectionError />
  return summary ? <StatsKpiRow summary={summary} /> : null
}

interface CurveProps {
  failed: boolean
  rows: NormalizedRow[]
  range: RangeKey
  onRangeChange: (range: RangeKey) => void
  strategyTypes: StrategyTypeStats[]
  strategyTypeFilter?: string
  onStrategyTypeFilterChange: (type: string | undefined) => void
}

export function CurveSection({ failed, ...chartProps }: CurveProps) {
  if (!failed) return <EquityCurveChart {...chartProps} />
  return (
    <div className="flex flex-col gap-3">
      <SectionError />
      <div className="flex justify-end">
        <StrategyTypeFilterToggle
          strategyTypes={chartProps.strategyTypes}
          strategyTypeFilter={chartProps.strategyTypeFilter}
          onStrategyTypeFilterChange={chartProps.onStrategyTypeFilterChange}
        />
      </div>
    </div>
  )
}
