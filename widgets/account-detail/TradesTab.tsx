'use client'

import { useReducer } from 'react'
import { useAccountCycleHistoryQuery } from '@entities/trade'
import { CycleHistoryTable, buildParams, type RangeType } from '@widgets/cycle-history'

type State = { rangeType: RangeType; customFrom: string; customTo: string; pageSize: string }
type Action =
  | { type: 'SET_RANGE'; rangeType: RangeType }
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
  accountId: string
}

export function TradesTab({ accountId }: Props) {
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const { rangeType, customFrom, customTo, pageSize } = state
  const baseParams = buildParams(rangeType, customFrom, customTo)
  const params = baseParams !== null ? { ...baseParams, size: Number(pageSize) } : null
  const { cycleHistory, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAccountCycleHistoryQuery(accountId, params)

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
