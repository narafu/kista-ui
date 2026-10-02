'use client'

import { SegmentedToggle } from '@shared/ui/SegmentedToggle'
import type { StrategyTypeStats } from '@entities/stats'

interface Props {
  strategyTypes: StrategyTypeStats[]
  strategyTypeFilter?: string
  onStrategyTypeFilterChange: (type: string | undefined) => void
}

// '전체'(필터 없음 = undefined)를 SegmentedToggle 값으로 표현하기 위한 센티널.
const ALL = ''

/**
 * 사이클 성과·자산 추이 공통 전략 타입 필터 토글.
 * EquityCurveChart 실패 시에도 CyclePerformanceList 필터링이 가능하도록 독립 컴포넌트로 분리됨.
 */
export function StrategyTypeFilterToggle({ strategyTypes, strategyTypeFilter, onStrategyTypeFilterChange }: Props) {
  return (
    <SegmentedToggle
      aria-label="전략 타입"
      options={[{ value: ALL, label: '전체' }, ...strategyTypes.map(({ type }) => ({ value: type, label: type }))]}
      value={strategyTypeFilter ?? ALL}
      onChange={(type) => onStrategyTypeFilterChange(type === ALL ? undefined : type)}
      className="-mx-1 flex max-w-full items-center gap-0.5 overflow-x-auto"
    />
  )
}
