import type { OrderDirection, OrderStatus, OrderType, UserRole, UserStatus } from '@shared/lib/api-schema'

export interface AdminUser {
  id: string
  nickname: string
  status: UserStatus
  role: UserRole
  createdAt: string
}

export interface AdminStats {
  totalUsers: number
  pendingCount: number
  activeCount: number
  rejectedCount: number
  totalAccounts: number
}

export interface AdminAccountStrategy {
  id: string
  type: string
  status: string
  ticker: string
}

export interface AdminAccount {
  id: string
  userId: string
  ownerNickname: string
  accountNoMasked: string
  broker: string
  strategies: AdminAccountStrategy[]
}

export interface AdminTrade {
  id: string
  userId: string
  accountId: string
  strategyId: string | null
  ownerNickname: string
  strategyType?: string
  tradeDate: string
  ticker: string
  direction: OrderDirection
  orderType: OrderType
  quantity: number
  price: number
  status: 'PLACED' | 'FILLED' | 'FAILED'
}

export interface AdminStrategy {
  id: string
  type: string
  status: 'ACTIVE' | 'PAUSED'
  ticker: string
  cycleSeedType: string
}

export interface AdminStrategyOrder {
  id: string
  userId: string
  ownerNickname: string
  strategyType?: string | null
  tradeDate: string
  ticker: string
  direction: OrderDirection
  orderType: OrderType
  timing: 'AT_OPEN' | 'AT_CLOSE' | 'IMMEDIATE'
  quantity: number
  price: number
  status: OrderStatus
  externalOrderId?: string | null
  filledQuantity?: number | null
  filledPrice?: number | null
}

export interface AdminReorderTimingAvailability {
  atOpen: boolean
  atClose: boolean
  immediate: boolean
}

export interface AdminReorderRequest {
  userId: string
  accountId: string
  strategyId: string
  orderId: string
  timing: 'AT_OPEN' | 'AT_CLOSE' | 'IMMEDIATE'
  tradeDate: string
  direction?: OrderDirection
  quantity?: number
  price?: number
  memo?: string
}

export interface AdminReorderResponse {
  userId: string
  accountId: string
  strategyId: string
  sourceOrderId: string
  originalStatus: OrderStatus
  resultingStatus: OrderStatus
  newOrderExternalId?: string | null
}

export interface AdminAuditLog {
  id: string
  adminId: string
  action: string
  targetType: string | null
  targetId: string | null
  payload: Record<string, unknown> | null
  createdAt: string
}

export interface AdminAnomalyAccount {
  id: string
  userId: string
  ownerNickname: string
  accountNoMasked: string
}

export interface AdminAnomalies {
  pausedAccounts: AdminAnomalyAccount[]
  inactiveAccounts: AdminAnomalyAccount[]
}

export interface AppErrorLog {
  id: string
  errorType: string
  message: string
  stackTrace: string
  context: Record<string, string>
  createdAt: string
}
