export type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED'
export type UserRole = 'USER' | 'ADMIN'
export type NotificationChannel = 'NONE' | 'TELEGRAM' | 'FCM' | 'ALL'

export interface User {
  id: string
  nickname: string
  status: UserStatus
  role: UserRole
  hasTelegram: boolean
  telegramBotUsername?: string | null
  notificationChannel?: NotificationChannel
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

export interface AdminAccount {
  id: string
  userId: string
  ownerNickname: string
  accountNoMasked: string
}

export interface AdminTrade {
  id: string
  userId: string
  ownerNickname: string
  tradeDate: string
  ticker: string
  direction: 'BUY' | 'SELL'
  orderType: 'LOC' | 'MOC' | 'LIMIT'
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
