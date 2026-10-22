export type { BrokerCode } from '@shared/lib/api-schema'
import type { BrokerCode } from '@shared/lib/api-schema'

export interface Account {
  id: string
  nickname: string
  accountNoMasked: string | null // 업비트·메리츠는 계좌번호가 없어 null
  accountNo?: string | null
  broker: BrokerCode
  apiKeyExpiresAt?: string | null // 업비트 API 키 만료 시각(ISO). 만료일을 모르는 broker는 null
}

export interface AccountRequest {
  nickname: string
  accountNo?: string
  appKey?: string
  secretKey?: string
  broker?: BrokerCode
}
