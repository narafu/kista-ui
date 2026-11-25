export type { BrokerCode } from '@shared/lib/api-schema'
import type { BrokerCode } from '@shared/lib/api-schema'

export interface ApiKeyExpiry {
  status: 'OK' | 'EXPIRING' | 'EXPIRED' | 'NONE'
  expiresOn?: string | null // yyyy-MM-dd(KST)
  daysLeft?: number | null
}

export interface Account {
  id: string
  nickname: string
  accountNoMasked: string | null // 업비트·메리츠는 계좌번호가 없어 null
  accountNo?: string | null
  broker: BrokerCode
  apiKeyExpiresAt?: string | null // API 키 만료 시각(ISO). 만료일을 모르는 broker는 null
  apiKeyExpiry?: ApiKeyExpiry // 서버 판정(KST 일수 기준). 구버전·누락 응답이면 undefined → 배지 없음
}

export interface CredentialsRequest {
  appKey: string
  secretKey: string
  apiKeyExpiresOn?: string // 실제 만료일(yyyy-MM-dd, KST). 비우면 생략
}

export interface AccountRequest {
  nickname: string
  accountNo?: string
  appKey?: string
  secretKey?: string
  broker?: BrokerCode
  apiKeyExpiresOn?: string // 사용자가 입력한 실제 만료일(yyyy-MM-dd, KST). 비우면 생략
}
