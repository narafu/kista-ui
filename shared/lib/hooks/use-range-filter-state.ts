// 기간 필터(range) + 커스텀 날짜 + 페이지 크기 상태를 관리하는 공용 reducer 훅.
// TradesTab / StrategyTradesTab에서 토씨까지 동일하던 State/Action/reducer/INITIAL을 추출.
'use client'

import { useReducer } from 'react'
import type { RangePreset } from '@shared/lib/date-range'

export type RangeFilterState = { rangeType: RangePreset; customFrom: string; customTo: string; pageSize: string }
export type RangeFilterAction =
  | { type: 'SET_RANGE'; rangeType: RangePreset }
  | { type: 'SET_CUSTOM_FROM'; value: string }
  | { type: 'SET_CUSTOM_TO'; value: string }
  | { type: 'SET_PAGE_SIZE'; value: string }

function reducer(state: RangeFilterState, action: RangeFilterAction): RangeFilterState {
  switch (action.type) {
    case 'SET_RANGE': return { ...state, rangeType: action.rangeType }
    case 'SET_CUSTOM_FROM': return { ...state, customFrom: action.value }
    case 'SET_CUSTOM_TO': return { ...state, customTo: action.value }
    case 'SET_PAGE_SIZE': return { ...state, pageSize: action.value }
  }
}

const INITIAL: RangeFilterState = { rangeType: '7d', customFrom: '', customTo: '', pageSize: '10' }

/** 기간 프리셋 + 커스텀 날짜 + 페이지 크기 상태와 디스패치 헬퍼를 반환한다. */
export function useRangeFilterState() {
  const [state, dispatch] = useReducer(reducer, INITIAL)
  return {
    ...state,
    setRangeType: (r: RangePreset) => dispatch({ type: 'SET_RANGE', rangeType: r }),
    setCustomFrom: (v: string) => dispatch({ type: 'SET_CUSTOM_FROM', value: v }),
    setCustomTo: (v: string) => dispatch({ type: 'SET_CUSTOM_TO', value: v }),
    setPageSize: (v: string) => dispatch({ type: 'SET_PAGE_SIZE', value: v }),
  }
}
