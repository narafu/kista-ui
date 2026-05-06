export type Strategy = 'INFINITE' | 'PRIVACY'
export type StrategyStatus = 'ACTIVE' | 'PAUSED'

export interface Account {
  id: string
  userId: string
  nickname: string
  accountNo: string
  kisAppKey: string
  kisSecretKey: string
  strategy: Strategy
  strategyStatus: StrategyStatus
  telegramBotToken?: string
  telegramChatId?: string
  createdAt: string
  updatedAt: string
}
