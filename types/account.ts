export type Strategy = 'INFINITE' | 'PRIVACY'
export type StrategyStatus = 'ACTIVE' | 'PAUSED'

export interface Account {
  id: string
  nickname: string
  accountNoMasked: string
  strategy: Strategy
  strategyStatus: StrategyStatus
  hasTelegram: boolean
}

export interface AccountRequest {
  nickname: string
  accountNo?: string
  kisAppKey?: string
  kisSecretKey?: string
  kisAccountType?: string
  strategy?: Strategy
  telegramBotToken?: string
  telegramChatId?: string
}
