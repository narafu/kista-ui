export type { UserStatus, UserRole, NotificationChannel } from '@shared/lib/api-schema'
import type { UserStatus, UserRole, NotificationChannel } from '@shared/lib/api-schema'

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
