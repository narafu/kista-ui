import { describe, expect, it } from 'vitest'
import { apiKeyExpiryState, isEstimatedExpiry, kstToday, kstTomorrow } from './apiKeyExpiry'

const now = new Date('2026-10-18T00:00:00+09:00')

describe('apiKeyExpiryState', () => {
  it('만료일이 없으면 표시하지 않는다', () => {
    expect(apiKeyExpiryState(null, now)).toBeNull()
    expect(apiKeyExpiryState(undefined, now)).toBeNull()
    expect(apiKeyExpiryState('not-a-date', now)).toBeNull()
  })

  it('만료 시각이 지났으면 EXPIRED다', () => {
    expect(apiKeyExpiryState('2026-10-17T23:59:59+09:00', now)).toBe('EXPIRED')
    expect(apiKeyExpiryState('2026-10-18T00:00:00+09:00', now)).toBe('EXPIRED')
  })

  it('30일 이내면 EXPIRING, 그보다 멀면 null이다', () => {
    expect(apiKeyExpiryState('2026-11-17T00:00:00+09:00', now)).toBe('EXPIRING')
    expect(apiKeyExpiryState('2026-11-17T00:00:01+09:00', now)).toBeNull()
  })
})

describe('kstToday', () => {
  it('UTC 날짜가 아닌 KST 날짜를 돌려준다', () => {
    expect(kstToday(new Date('2026-10-17T16:00:00Z'))).toBe('2026-10-18')
    expect(kstToday(new Date('2026-10-17T14:59:00Z'))).toBe('2026-10-17')
  })
})

describe('isEstimatedExpiry', () => {
  it('ESTIMATED만 true', () => {
    expect(isEstimatedExpiry('ESTIMATED')).toBe(true)
    expect(isEstimatedExpiry('NONE')).toBe(false)
    expect(isEstimatedExpiry(undefined)).toBe(false)
  })
})

describe('kstTomorrow', () => {
  it('KST 자정 직전/직후와 월말 경계에서 KST 기준 내일을 돌려준다', () => {
    expect(kstTomorrow(new Date('2026-10-17T14:59:00Z'))).toBe('2026-10-18')
    expect(kstTomorrow(new Date('2026-10-17T15:00:00Z'))).toBe('2026-10-19')
    expect(kstTomorrow(new Date('2026-10-31T15:00:00Z'))).toBe('2026-11-02')
  })
})
