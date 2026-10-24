import { describe, expect, it } from 'vitest'
import { brokerCurrency, isCryptoBroker, isCryptoMarket, isKeyOnlyBroker } from './api-schema'

describe('isCryptoBroker', () => {
  it('업비트만 코인 거래소로 본다', () => {
    expect(isCryptoBroker('UPBIT')).toBe(true)
    expect(isCryptoBroker('KIS')).toBe(false)
    expect(isCryptoBroker('TOSS')).toBe(false)
    expect(isCryptoBroker('MOCK')).toBe(false)
  })

  it('빈 값과 모르는 broker는 코인이 아니다', () => {
    expect(isCryptoBroker(undefined)).toBe(false)
    expect(isCryptoBroker(null)).toBe(false)
    expect(isCryptoBroker('')).toBe(false)
    expect(isCryptoBroker('BITHUMB')).toBe(false)
  })
})

describe('isKeyOnlyBroker', () => {
  it('계좌번호 없이 키만 받는 broker는 업비트·메리츠다', () => {
    expect(isKeyOnlyBroker('UPBIT')).toBe(true)
    expect(isKeyOnlyBroker('MERITZ')).toBe(true)
    expect(isKeyOnlyBroker('KIS')).toBe(false)
    expect(isKeyOnlyBroker('TOSS')).toBe(false)
    expect(isKeyOnlyBroker('MOCK')).toBe(false)
  })

  it('메리츠는 주식 broker라 코인이 아니고 USD다', () => {
    expect(isCryptoBroker('MERITZ')).toBe(false)
    expect(brokerCurrency('MERITZ')).toBe('USD')
  })
})

describe('바이낸스', () => {
  it('USDT 마켓 코인 거래소이고 계좌번호 없이 키만 받는다', () => {
    expect(isCryptoBroker('BINANCE')).toBe(true)
    expect(isKeyOnlyBroker('BINANCE')).toBe(true)
    expect(brokerCurrency('BINANCE')).toBe('USDT')
  })
})

describe('brokerCurrency', () => {
  it('업비트는 KRW, 주식 broker는 USD다', () => {
    expect(brokerCurrency('UPBIT')).toBe('KRW')
    expect(brokerCurrency('KIS')).toBe('USD')
    expect(brokerCurrency('MOCK')).toBe('USD')
  })

  it('모르는 broker는 USD로 둔다', () => {
    expect(brokerCurrency(undefined)).toBe('USD')
  })
})

describe('isCryptoMarket', () => {
  it('CRYPTO_KRW·CRYPTO_USDT가 코인 시장이다', () => {
    expect(isCryptoMarket('CRYPTO_KRW')).toBe(true)
    expect(isCryptoMarket('CRYPTO_USDT')).toBe(true)
    expect(isCryptoMarket('US_STOCK')).toBe(false)
    // 1h 메타 캐시로 market이 빠진 티커는 주식으로 본다
    expect(isCryptoMarket(undefined)).toBe(false)
  })
})
