'use client'

import { useReducer } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card'
import { useStrategyCycleHistory } from '@hooks/useCycleHistory'
import { CycleHistoryTable } from './CycleHistoryTable'
import { buildParams, type RangeType } from './lib/buildParams'

type State = { rangeType: RangeType; customFrom: string; customTo: string }
type Action =
  | { type: 'SET_RANGE'; rangeType: RangeType }
  | { type: 'SET_CUSTOM_FROM'; value: string }
  | { type: 'SET_CUSTOM_TO'; value: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_RANGE': return { ...state, rangeType: action.rangeType }
    case 'SET_CUSTOM_FROM': return { ...state, customFrom: action.value }
    case 'SET_CUSTOM_TO': return { ...state, customTo: action.value }
  }
}

const INITIAL: State = { rangeType: '30d', customFrom: '', customTo: '' }

interface Props {
  strategyId: string | undefined
}

export function StrategyTradesTab({ strategyId }: Props) {
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const { rangeType, customFrom, customTo } = state
  const params = buildParams(rangeType, customFrom, customTo)
  const { cycleHistory, isLoading } = useStrategyCycleHistory(strategyId, params)

  if (!strategyId) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">거래 내역 (전략)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">전략이 없습니다.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <CycleHistoryTable
      title="거래 내역 (전략)"
      cycleHistory={cycleHistory}
      isLoading={isLoading}
      rangeType={rangeType}
      setRangeType={(r) => dispatch({ type: 'SET_RANGE', rangeType: r })}
      customFrom={customFrom}
      setCustomFrom={(v) => dispatch({ type: 'SET_CUSTOM_FROM', value: v })}
      customTo={customTo}
      setCustomTo={(v) => dispatch({ type: 'SET_CUSTOM_TO', value: v })}
    />
  )
}
