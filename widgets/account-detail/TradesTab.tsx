'use client'

import { useAccountCycleHistoryQuery } from '@entities/trade'
import { CycleHistoryTable } from '@widgets/cycle-history'
import { useRangeFilterState } from '@shared/lib/hooks/use-range-filter-state'
import { resolveRangeStrict } from '@shared/lib/date-range'

interface Props {
  accountId: string
}

export function TradesTab({ accountId }: Props) {
  const { rangeType, customFrom, customTo, pageSize, setRangeType, setCustomFrom, setCustomTo, setPageSize } =
    useRangeFilterState()
  const baseParams = resolveRangeStrict(rangeType, customFrom, customTo)
  const params = baseParams !== null ? { ...baseParams, size: Number(pageSize) } : null
  const { cycleHistory, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAccountCycleHistoryQuery(accountId, params)

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
