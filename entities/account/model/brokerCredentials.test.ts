import { describe, expect, it } from 'vitest'
import { ApiError } from '@shared/lib/api-client'
import { BROKER_CREDENTIAL, brokerErrorMessage } from './brokerCredentials'

function apiError(status: number, code: string, detail = '서버 메시지') {
  return new ApiError(status, { code, detail })
}

describe('brokerErrorMessage', () => {
  it('자격증명 오류는 호출부가 넘긴 broker별 문구를 쓴다', () => {
    expect(brokerErrorMessage(apiError(422, 'BROKER_CREDENTIAL_INVALID'), '키를 확인하세요.', '실패'))
      .toBe('키를 확인하세요.')
  })

  it('IP 미허용·권한 부족·호출 제한은 고정 문구로 구분한다', () => {
    expect(brokerErrorMessage(apiError(422, 'BROKER_IP_NOT_ALLOWED'), 'x', '실패')).toContain('허용 IP')
    expect(brokerErrorMessage(apiError(422, 'BROKER_PERMISSION_DENIED'), 'x', '실패')).toContain('권한')
    expect(brokerErrorMessage(apiError(429, 'BROKER_RATE_LIMITED'), 'x', '실패')).toContain('잠시 후')
  })

  it('출금 권한이 켜진 키는 전용 문구로 안내하고, 바이낸스 자격증명 문구는 허용 IP 확인을 함께 안내한다', () => {
    expect(brokerErrorMessage(apiError(422, 'BROKER_WITHDRAWAL_ENABLED'), 'x', '실패')).toContain('출금 권한')
    expect(BROKER_CREDENTIAL.BINANCE.invalidMessage).toContain('허용 IP')
  })

  it('그 외 코드는 서버 detail을 쓰고, detail이 없으면 fallback을 쓴다', () => {
    expect(brokerErrorMessage(apiError(409, 'DUPLICATE_ACCOUNT', '이미 등록된 계좌입니다.'), 'x', '실패'))
      .toBe('이미 등록된 계좌입니다.')
    expect(brokerErrorMessage(new Error('network'), 'x', '실패')).toBe('실패')
  })
})
