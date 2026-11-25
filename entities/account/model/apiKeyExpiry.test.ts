import { describe, expect, it } from 'vitest'
import { isEstimatedExpiry, kstToday, kstTomorrow } from './apiKeyExpiry'

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
