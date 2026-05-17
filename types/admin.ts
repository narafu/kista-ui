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
