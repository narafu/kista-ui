'use client'

import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@shared/lib/utils'
import { EquityLineChart } from '@shared/ui/EquityLineChart'
import type { StrategyTypeStats } from '@entities/stats'
import type { NormalizedRow } from './lib/normalizeEquityCurve'
import type { RangeKey } from './StatsOverview'
import { StrategyTypeFilterToggle } from './StrategyTypeFilterToggle'

interface Props {
  rows: NormalizedRow[]
  range: RangeKey
  onRangeChange: (range: RangeKey) => void
  strategyTypes: StrategyTypeStats[]
  strategyTypeFilter?: string
  onStrategyTypeFilterChange: (type: string | undefined) => void
}

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1Y' },
  { value: 'ALL', label: '전체' },
]

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex min-h-9 w-full items-center justify-center rounded px-2 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
      )}
    >
      {children}
    </button>
  )
}

export function EquityCurveChart({
  rows,
  range,
  onRangeChange,
  strategyTypes,
  strategyTypeFilter,
  onStrategyTypeFilterChange,
}: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base lg:text-lg">누적 자산 추이</CardTitle>
          <StrategyTypeFilterToggle
            strategyTypes={strategyTypes}
            strategyTypeFilter={strategyTypeFilter}
            onStrategyTypeFilterChange={onStrategyTypeFilterChange}
          />
        </div>
        <div className="grid w-full grid-cols-5 rounded-md border border-border p-0.5 sm:w-auto sm:max-w-sm">
          {RANGE_OPTIONS.map((option) => (
            <ToggleButton key={option.value} active={range === option.value} onClick={() => onRangeChange(option.value)}>
              {option.label}
            </ToggleButton>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6 sm:pb-6">
        <EquityLineChart rows={rows} />
        <p className="mt-2 text-xs text-muted-foreground">
          전략에 배정된 예수금 기준 근사치입니다. 수수료는 반영되지 않습니다.
        </p>
      </CardContent>
    </Card>
  )
}
