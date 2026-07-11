'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStrategyCycleHistoryQuery } from '@entities/trade'
import { CycleHistoryTable } from './CycleHistoryTable'
import { EmptyState } from '@shared/ui/EmptyState'
import { useRangeFilterState } from '@shared/lib/hooks/use-range-filter-state'
import { resolveRangeStrict } from '@shared/lib/date-range'

interface Props {
  strategyId: string | undefined
}

export function StrategyTradesTab({ strategyId }: Props) {
  const { rangeType, customFrom, customTo, pageSize, setRangeType, setCustomFrom, setCustomTo, setPageSize } =
    useRangeFilterState()
  const baseParams = resolveRangeStrict(rangeType, customFrom, customTo)
  const params = baseParams !== null ? { ...baseParams, size: Number(pageSize) } : null
  const { cycleHistory, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useStrategyCycleHistoryQuery(strategyId, params)

  if (!strategyId) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">잔고 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState variant="text" message="전략이 없습니다." />
        </CardContent>
      </Card>
    )
  }

  return (
    <CycleHistoryTable
      title="잔고 이력"
      cycleHistory={cycleHistory}
      isLoading={isLoading}
      rangeType={rangeType}
      setRangeType={setRangeType}
      customFrom={customFrom}
      setCustomFrom={setCustomFrom}
      customTo={customTo}
      setCustomTo={setCustomTo}
      pageSize={pageSize}
      setPageSize={setPageSize}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
    />
  )
}
