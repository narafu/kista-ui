import { useMemo } from 'react'
import { useMeta } from '@entities/meta'
import { PRIVACY_ORDER_DIRECTIONS, PRIVACY_ORDER_TYPES } from '@entities/privacy'

// 등록·추가 다이얼로그가 공유하는 Select 항목 (value + 표시 라벨)
export function usePrivacyOrderSelectItems() {
  const { labelOf } = useMeta()
  return useMemo(() => ({
    directionItems: PRIVACY_ORDER_DIRECTIONS.map((value) => ({ value, label: labelOf('orderDirections', value) })),
    orderTypeItems: PRIVACY_ORDER_TYPES.map((value) => ({ value, label: labelOf('orderTypes', value) })),
  }), [labelOf])
}
