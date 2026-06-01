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
