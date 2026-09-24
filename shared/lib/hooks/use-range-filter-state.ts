// 기간 필터(range) + 커스텀 날짜 + 페이지 크기 상태를 관리하는 공용 훅.
// TradesTab / StrategyTradesTab에서 토씨까지 동일하던 상태 구조를 추출.
'use client'

import { useState } from 'react'
import type { RangePreset } from '@shared/lib/date-range'

export type RangeFilterState = { rangeType: RangePreset; customFrom: string; customTo: string; pageSize: string }

const INITIAL: RangeFilterState = { rangeType: '7d', customFrom: '', customTo: '', pageSize: '10' }

/** 기간 프리셋 + 커스텀 날짜 + 페이지 크기 상태와 필드별 setter를 반환한다. */
export function useRangeFilterState() {
  const [state, setState] = useState<RangeFilterState>(INITIAL)
  const set = <K extends keyof RangeFilterState>(key: K) =>
    (value: RangeFilterState[K]) => setState((prev) => ({ ...prev, [key]: value }))

  return {
    ...state,
    setRangeType: set('rangeType'),
    setCustomFrom: set('customFrom'),
    setCustomTo: set('customTo'),
    setPageSize: set('pageSize'),
  }
}
