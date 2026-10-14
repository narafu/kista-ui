import { DIRECTION_LABEL, ORDER_TYPE_LABEL } from '@entities/trade'
import { PRIVACY_ORDER_DIRECTIONS, PRIVACY_ORDER_TYPES } from '@entities/privacy'

// 등록·추가 다이얼로그가 공유하는 Select 항목 (value + 표시 라벨)
export const DIRECTION_ITEMS = PRIVACY_ORDER_DIRECTIONS.map((value) => ({ value, label: DIRECTION_LABEL[value] }))
export const ORDER_TYPE_ITEMS = PRIVACY_ORDER_TYPES.map((value) => ({ value, label: ORDER_TYPE_LABEL[value] }))
