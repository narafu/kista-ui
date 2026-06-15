export type { BrokerCode } from '@shared/lib/api-schema'
import type { BrokerCode } from '@shared/lib/api-schema'

export interface Account {
  id: string
  nickname: string
  accountNoMasked: string
  broker: BrokerCode
}

export interface AccountRequest {
  nickname: string
  accountNo?: string
  appKey?: string
  secretKey?: string
  broker?: BrokerCode
}
