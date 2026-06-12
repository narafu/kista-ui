// API 스펙에서 파생된 enum 타입 — 직접 정의 금지, openapi.json이 SSOT
// 갱신: npm run gen:types (openapi.json 교체 후 실행)
import type { components } from './api-types'

export type BrokerCode = NonNullable<components['schemas']['AccountRequest']['broker']>

export type UserStatus = NonNullable<components['schemas']['UserResponse']['status']>
export type UserRole = NonNullable<components['schemas']['UserResponse']['role']>
export type NotificationChannel = NonNullable<components['schemas']['UserResponse']['notificationChannel']>

export type CycleSeedType = NonNullable<components['schemas']['TradingCycleRequest']['cycleSeedType']>
export type StrategyType = NonNullable<components['schemas']['TradingCycleRequest']['type']>
export type StrategyTicker = NonNullable<components['schemas']['TradingCycleRequest']['ticker']>

export type OrderType = NonNullable<components['schemas']['Order']['orderType']>
export type OrderDirection = NonNullable<components['schemas']['Order']['direction']>
export type OrderStatus = NonNullable<components['schemas']['Order']['status']>

export type SkipReason = NonNullable<components['schemas']['NextOrdersResponse']['skipReason']>
