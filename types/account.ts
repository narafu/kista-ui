export type Strategy = 'INFINITE' | 'PRIVACY'
export type StrategyStatus = 'ACTIVE' | 'PAUSED'

export interface Account {
  id: string
  nickname: string
  accountNoMasked: string
  strategy: Strategy
  strategyStatus: StrategyStatus
  hasTelegram: boolean
  symbol: string
}

export interface AccountRequest {
  nickname: string
  accountNo?: string
  kisAppKey?: string
  kisSecretKey?: string
  kisAccountType?: string
  strategyType?: Strategy
  ticker?: string
  telegramBotToken?: string
  telegramChatId?: string
}
