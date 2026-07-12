'use client'

import { useStrategyCycleHistoryQuery } from '@entities/trade'
import { CycleHistoryTable } from './CycleHistoryTable'

interface Props {
  strategyId: string | undefined
}

export function StrategyTradesTab({ strategyId }: Props) {
  return (
    <CycleHistoryTable
      title="잔고 이력"
      id={strategyId}
      useHistoryQuery={useStrategyCycleHistoryQuery}
      emptyIdMessage="전략이 없습니다."
    />
  )
}
