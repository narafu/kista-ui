'use client'

import { cn } from '@shared/lib/utils'
import type { StrategyTypeStats } from '@entities/stats'

interface Props {
  strategyTypes: StrategyTypeStats[]
  strategyTypeFilter?: string
  onStrategyTypeFilterChange: (type: string | undefined) => void
}

/**
 * 사이클 성과·자산 추이 공통 전략 타입 필터 토글.
 * EquityCurveChart 실패 시에도 CyclePerformanceList 필터링이 가능하도록 독립 컴포넌트로 분리됨.
 */
export function StrategyTypeFilterToggle({ strategyTypes, strategyTypeFilter, onStrategyTypeFilterChange }: Props) {
  return (
    <div className="-mx-1 flex max-w-full items-center gap-0.5 overflow-x-auto rounded-md border border-border p-0.5">
      <button
        type="button"
        aria-pressed={strategyTypeFilter === undefined}
        onClick={() => onStrategyTypeFilterChange(undefined)}
        className={cn(
          'flex min-h-9 shrink-0 items-center justify-center rounded px-2 text-xs font-medium transition-colors',
          strategyTypeFilter === undefined
            ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent',
        )}
      >
        전체
      </button>
      {strategyTypes.map((typeStats) => (
        <button
          key={typeStats.type}
          type="button"
          aria-pressed={strategyTypeFilter === typeStats.type}
          onClick={() => onStrategyTypeFilterChange(typeStats.type)}
          className={cn(
            'flex min-h-9 shrink-0 items-center justify-center rounded px-2 text-xs font-medium transition-colors',
            strategyTypeFilter === typeStats.type
              ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent',
          )}
        >
          {typeStats.type}
        </button>
      ))}
    </div>
  )
}
