import { describe, expect, it } from 'vitest'
import { isStockTicker } from './marketRules'

describe('isStockTicker', () => {
  const soxl = { code: 'SOXL', exchangeCode: 'AMS', targetProfitRate: '0' }

  it('markets가 있으면 US_STOCK 포함 여부로 판정한다', () => {
    expect(isStockTicker({ ...soxl, markets: ['US_STOCK'] })).toBe(true)
    expect(isStockTicker({ ...soxl, markets: ['OTHER'] })).toBe(false)
  })

  it('markets가 없으면 단수 market으로 폴백하고, 둘 다 없으면 주식으로 본다', () => {
    expect(isStockTicker({ ...soxl, market: 'US_STOCK' })).toBe(true)
    expect(isStockTicker({ ...soxl, market: 'OTHER' })).toBe(false)
    expect(isStockTicker(soxl)).toBe(true)
    expect(isStockTicker(undefined)).toBe(false)
  })
})
