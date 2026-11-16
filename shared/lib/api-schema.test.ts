import { describe, expect, it } from 'vitest'
import { isKeyOnlyBroker, toCurrency } from './api-schema'

describe('isKeyOnlyBroker', () => {
  it('메리츠만 계좌번호 없이 키만 받는다', () => {
    expect(isKeyOnlyBroker('MERITZ')).toBe(true)
    expect(isKeyOnlyBroker('TOSS')).toBe(false)
    expect(isKeyOnlyBroker('MOCK')).toBe(false)
    expect(isKeyOnlyBroker(undefined)).toBe(false)
  })
})

describe('toCurrency', () => {
  it('USD·KRW만 통화로 좁힌다', () => {
    expect(toCurrency('USD')).toBe('USD')
    expect(toCurrency('KRW')).toBe('KRW')
    expect(toCurrency('EUR')).toBeUndefined()
    expect(toCurrency(null)).toBeUndefined()
  })
})
