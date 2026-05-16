export type Strategy = 'INFINITE' | 'PRIVACY'
export type StrategyStatus = 'ACTIVE' | 'PAUSED'

export interface Account {
  id: string
  nickname: string
  accountNoMasked: string
  strategyType: Strategy
  strategyStatus: StrategyStatus
  hasTelegram: boolean
  ticker: string
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
