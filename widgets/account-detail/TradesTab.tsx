'use client'

import { useAccountCycleHistoryQuery } from '@entities/trade'
import { CycleHistoryTable } from '@widgets/cycle-history'
import type { DateParams } from '@entities/trade/hooks/useCycleHistory'

interface Props {
  accountId: string
}

export function TradesTab({ accountId }: Props) {
  return (
    <CycleHistoryTable
      title="잔고 이력"
      id={accountId}
      useHistoryQuery={(id: string | undefined, params: DateParams) => useAccountCycleHistoryQuery(id!, params)}
    />
  )
}
