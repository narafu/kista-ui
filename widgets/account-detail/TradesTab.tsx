'use client'

import { useAccountCycleHistoryQuery } from '@entities/trade'
import { CycleHistoryTable } from '@widgets/cycle-history'
import type { DateParams } from '@entities/trade/hooks/useCycleHistory'

interface Props {
  accountId: string
}

// accountId가 항상 정의된 이 위젯 전용 래퍼 — useHistoryQuery 타입(id: string | undefined)과 맞추기 위함
function useAccountCycleHistory(id: string | undefined, params: DateParams) {
  return useAccountCycleHistoryQuery(id!, params)
}

export function TradesTab({ accountId }: Props) {
  return (
    <CycleHistoryTable
      title="잔고 이력"
      id={accountId}
      useHistoryQuery={useAccountCycleHistory}
    />
  )
}
