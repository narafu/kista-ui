export type BrokerCode = 'KIS' | 'TOSS'

export interface Account {
  id: string
  nickname: string
  accountNoMasked: string
  broker: BrokerCode
}

export interface AccountRequest {
  nickname: string
  accountNo?: string
  kisAppKey?: string
  kisSecretKey?: string
  broker?: BrokerCode
}
