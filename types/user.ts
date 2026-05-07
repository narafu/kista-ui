export type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED'

export interface User {
  id: string
  nickname: string
  status: UserStatus
  hasTelegram: boolean
}
