'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@shared/lib/utils'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'
import { EquityLineChart } from '@shared/ui/EquityLineChart'
import type { StrategyTypeStats } from '@entities/stats'
import type { NormalizedRow } from './lib/normalizeEquityCurve'
import type { RangeKey } from './StatsOverview'
import { StrategyTypeFilterToggle } from './StrategyTypeFilterToggle'

interface Props {
  rows: NormalizedRow[]
  // 기간·타입 변경 직후 새 데이터 도착 전까지 이전 차트를 보여주는 중(placeholderData)
  stale: boolean
  range: RangeKey
  onRangeChange: (range: RangeKey) => void
  strategyTypes: StrategyTypeStats[]
  strategyTypeFilter?: string
  onStrategyTypeFilterChange: (type: string | undefined) => void
}

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: '1M', label: '1개월' },
  { value: '3M', label: '3개월' },
  { value: '6M', label: '6개월' },
  { value: '1Y', label: '1년' },
  { value: 'ALL', label: '전체' },
]

export function EquityCurveChart({
  rows,
  stale,
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
          <CardTitle className="text-base lg:text-lg"><h2>누적 자산 추이</h2></CardTitle>
          <StrategyTypeFilterToggle
            strategyTypes={strategyTypes}
            strategyTypeFilter={strategyTypeFilter}
            onStrategyTypeFilterChange={onStrategyTypeFilterChange}
          />
        </div>
        <SegmentedToggle
          aria-label="기간"
          options={RANGE_OPTIONS}
          value={range}
          onChange={onRangeChange}
          className="grid w-full grid-cols-5 sm:w-auto sm:max-w-sm"
        />
      </CardHeader>
      <CardContent aria-busy={stale} className={cn('px-2 pb-4 transition-opacity sm:px-6 sm:pb-6', stale && 'opacity-60')}>
        <EquityLineChart rows={rows} title="누적 자산 추이" />
        <p className="mt-2 text-xs text-muted-foreground">
          전략에 배정된 예수금 기준 근사치입니다. 수수료는 반영되지 않습니다.
        </p>
      </CardContent>
    </Card>
  )
}
