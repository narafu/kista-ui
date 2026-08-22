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
  strategySuggestions: string[]
}

// kista-api UserSettings.DEFAULT_STRATEGY_SUGGESTIONS와 동일한 값 — 쿼리 로딩 전 폴백으로 쓴다.
export const DEFAULT_STRATEGY_SUGGESTIONS = ['VR', 'INFINITE', 'PRIVACY', 'DCA']
