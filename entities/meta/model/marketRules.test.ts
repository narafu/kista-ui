import { describe, expect, it } from 'vitest'
import { orderAmountRuleOf, tickerTradesIn } from './marketRules'

describe('orderAmountRuleOf', () => {
  it('메타의 최소 금액·자릿수를 쓰고 통화는 broker에서 정한다', () => {
    expect(orderAmountRuleOf('UPBIT', { code: 'UPBIT', label: '업비트', minOrderAmount: '5000', amountScale: 0 }))
      .toEqual({ min: 5000, scale: 0, currency: 'KRW' })
  })

  it('메타 필드가 빠지면 통화별 폴백 최소 금액·기본 자릿수로 둔다', () => {
    expect(orderAmountRuleOf('UPBIT', { code: 'UPBIT', label: '업비트' })).toEqual({ min: 5000, scale: 0, currency: 'KRW' })
    expect(orderAmountRuleOf('BINANCE', undefined)).toEqual({ min: 5, scale: 2, currency: 'USDT' })
    expect(orderAmountRuleOf('KIS', undefined)).toEqual({ min: 0, scale: 2, currency: 'USD' })
  })
})

describe('tickerTradesIn', () => {
  const btc = { code: 'BTC', exchangeCode: 'UPBIT', targetProfitRate: '0', market: 'CRYPTO_KRW', markets: ['CRYPTO_KRW', 'CRYPTO_USDT'] }

  it('markets에 시장이 있으면 거래 가능하다', () => {
    expect(tickerTradesIn(btc, 'CRYPTO_USDT')).toBe(true)
    expect(tickerTradesIn(btc, 'US_STOCK')).toBe(false)
  })

  it('markets가 없으면 단수 market으로, market도 없으면 주식으로 본다', () => {
    expect(tickerTradesIn({ ...btc, markets: undefined }, 'CRYPTO_USDT')).toBe(false)
    expect(tickerTradesIn({ ...btc, markets: undefined }, 'CRYPTO_KRW')).toBe(true)
    expect(tickerTradesIn({ code: 'SOXL', exchangeCode: 'AMS', targetProfitRate: '0' }, 'US_STOCK')).toBe(true)
    expect(tickerTradesIn(undefined, 'US_STOCK')).toBe(false)
  })
})
