import { apiErrorCode, apiMsg } from '@shared/lib/api-client'
import type { ErrorCode } from '@shared/lib/api-schema'
import type { BrokerCode } from './types'

export type CredentialBroker = Exclude<BrokerCode, 'MOCK'>

// 계좌 등록 확인 스텝·키 재등록에서 자격증명 오류(BROKER_CREDENTIAL_INVALID)일 때 짚어줄 입력 항목
export const BROKER_CREDENTIAL: Record<CredentialBroker, { keyLabel: string; secretLabel: string; invalidMessage: string }> = {
  KIS: { keyLabel: 'App Key', secretLabel: 'App Secret', invalidMessage: 'App Key, App Secret 또는 계좌번호를 다시 확인하세요.' },
  TOSS: { keyLabel: 'Client ID', secretLabel: 'Client Secret', invalidMessage: 'Toss 자격증명 인증에 실패했습니다. Client ID와 Client Secret을 확인하세요.' },
  UPBIT: { keyLabel: 'Access Key', secretLabel: 'Secret Key', invalidMessage: 'Access Key와 Secret Key를 다시 확인하세요. 만료된 키는 업비트에서 새로 발급받으세요.' },
  MERITZ: { keyLabel: 'App Key', secretLabel: 'App Secret', invalidMessage: 'App Key와 App Secret을 다시 확인하세요. 메리츠증권 Open API 포털에서 발급받은 키여야 합니다.' },
}

// 업비트·메리츠 모두 권한 부족(BROKER_PERMISSION_DENIED)을 돌려줄 수 있어 broker 공용 문구로 둔다. 업비트에 필요한 권한 목록은 UpbitKeyGuide가 안내한다
const BROKER_ERROR_MESSAGE: Partial<Record<ErrorCode, string>> = {
  BROKER_IP_NOT_ALLOWED: '허용 IP가 등록되지 않았습니다. 거래소 API 키 설정에 안내된 IP를 추가하세요.',
  BROKER_PERMISSION_DENIED: 'API 키 권한이 부족합니다. 증권사·거래소의 API 키 설정에서 조회·주문 권한을 켜세요.',
  BROKER_RATE_LIMITED: '요청이 많아 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.',
}

// 연결 테스트·계좌 등록·키 재등록 실패 문구. 자격증명 오류만 broker별 입력 항목을 짚고, 나머지는 서버 detail을 쓴다
export function brokerErrorMessage(err: unknown, credentialInvalidMessage: string, fallback: string): string {
  const code = apiErrorCode(err)
  if (code === 'BROKER_CREDENTIAL_INVALID') return credentialInvalidMessage
  return (code && BROKER_ERROR_MESSAGE[code]) || apiMsg(err, fallback)
}
