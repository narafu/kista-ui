export type { UserStatus, UserRole, NotificationChannel } from '@shared/lib/api-schema'
import type { UserStatus, UserRole, NotificationChannel, OrderDirection, OrderType } from '@shared/lib/api-schema'

export interface User {
  id: string
  nickname: string
  status: UserStatus
  role: UserRole
  hasTelegram: boolean
  telegramBotUsername?: string | null
  notificationChannel?: NotificationChannel
  balanceCheckEnabled: boolean
  notificationPrefs?: Record<string, boolean>
}

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
  broker: string | null
  strategies: AdminAccountStrategy[]
}

export interface AdminTrade {
  id: string
  userId: string
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
