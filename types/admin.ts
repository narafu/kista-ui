import type { UserStatus, UserRole } from './user'

export interface AdminUser {
  id: string
  nickname: string
  status: UserStatus
  role: UserRole
  createdAt: string  // ISO-8601 timestamp
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
  tradeDate: string   // YYYY-MM-DD
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
  createdAt: string  // ISO-8601 timestamp
}

export interface AdminAnomalyAccount {
  id: string
  userId: string
  ownerNickname: string
  accountNoMasked: string
}

export interface AdminAnomalyTrade {
  id: string
  accountId: string | null
  ownerNickname: string
  tradeDate: string
  ticker: string
  direction: string
  orderType: string
  quantity: number
  price: number
}

export interface AdminAnomalies {
  failedTrades: AdminAnomalyTrade[]
  pausedAccounts: AdminAnomalyAccount[]
  inactiveAccounts: AdminAnomalyAccount[]
}
