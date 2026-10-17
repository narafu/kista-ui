import { describe, expect, it } from 'vitest'
import { apiKeyExpiryState } from './apiKeyExpiry'

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
