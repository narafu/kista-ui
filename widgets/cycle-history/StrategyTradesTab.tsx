'use client'

import { useReducer } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStrategyCycleHistoryQuery } from '@entities/trade'
import { CycleHistoryTable } from './CycleHistoryTable'
import { EmptyState } from '@shared/ui/EmptyState'
import { resolveRangeStrict, type RangePreset } from '@shared/lib/date-range'

type State = { rangeType: RangePreset; customFrom: string; customTo: string; pageSize: string }
type Action =
  | { type: 'SET_RANGE'; rangeType: RangePreset }
  | { type: 'SET_CUSTOM_FROM'; value: string }
  | { type: 'SET_CUSTOM_TO'; value: string }
  | { type: 'SET_PAGE_SIZE'; value: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_RANGE': return { ...state, rangeType: action.rangeType }
    case 'SET_CUSTOM_FROM': return { ...state, customFrom: action.value }
    case 'SET_CUSTOM_TO': return { ...state, customTo: action.value }
    case 'SET_PAGE_SIZE': return { ...state, pageSize: action.value }
  }
}

const INITIAL: State = { rangeType: '7d', customFrom: '', customTo: '', pageSize: '10' }

interface Props {
  strategyId: string | undefined
}

export function StrategyTradesTab({ strategyId }: Props) {
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const { rangeType, customFrom, customTo, pageSize } = state
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
      setRangeType={(r) => dispatch({ type: 'SET_RANGE', rangeType: r })}
      customFrom={customFrom}
      setCustomFrom={(v) => dispatch({ type: 'SET_CUSTOM_FROM', value: v })}
      customTo={customTo}
      setCustomTo={(v) => dispatch({ type: 'SET_CUSTOM_TO', value: v })}
      pageSize={pageSize}
      setPageSize={(v) => dispatch({ type: 'SET_PAGE_SIZE', value: v })}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
    />
  )
}
