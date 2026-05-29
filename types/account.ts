export interface Account {
  id: string
  nickname: string
  accountNoMasked: string
  broker: string
}

export interface AccountRequest {
  nickname: string
  accountNo?: string
  kisAppKey?: string
  kisSecretKey?: string
}
