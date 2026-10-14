import type { AdminPrivacyOrder } from './types'

// 방향·유형 선택지 값 — 라벨은 호출부가 entities/trade의 DIRECTION_LABEL/ORDER_TYPE_LABEL로 입힌다
export const PRIVACY_ORDER_DIRECTIONS: AdminPrivacyOrder['direction'][] = ['BUY', 'SELL']
export const PRIVACY_ORDER_TYPES: AdminPrivacyOrder['orderType'][] = ['LOC', 'MOC', 'LIMIT']
