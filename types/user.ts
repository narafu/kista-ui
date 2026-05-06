export type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED'

export interface User {
  id: string
  kakaoId: string
  nickname: string
  status: UserStatus
  telegramBotToken?: string
  telegramChatId?: string
  createdAt: string
  updatedAt: string
}
