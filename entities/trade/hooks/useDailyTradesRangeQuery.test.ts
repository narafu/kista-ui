import { describe, expect, it } from 'vitest'
import { summarizeDailyTrades } from './useDailyTradesRangeQuery'
import type { DailyTransaction } from '../model/types'

const trade = (over: Partial<DailyTransaction>): DailyTransaction => ({
  tradeDate: '2026-11-08',
  direction: 'BUY',
  ticker: 'BTC',
  symbolName: 'BTC',
  quantity: 0.01,
  price: 100,
  tradeAmount: 0,
  currency: 'KRW',
  ...over,
})

describe('summarizeDailyTrades', () => {
  it('같은 날이라도 통화가 다르면 금액을 합치지 않고 통화 순서로 나눈다', () => {
    const map = summarizeDailyTrades([
      trade({ currency: 'USD', direction: 'BUY', tradeAmount: 100 }),
      trade({ currency: 'KRW', direction: 'BUY', tradeAmount: 50000 }),
      trade({ currency: 'KRW', direction: 'SELL', tradeAmount: 20000 }),
      trade({ currency: 'USD', direction: 'BUY', tradeAmount: 25.5 }),
    ])

    expect(map.get('2026-11-08')).toEqual({
      tradeCount: 4,
      byCurrency: [
        { currency: 'KRW', buyAmount: 50000, sellAmount: 20000, buyCount: 1, sellCount: 1 },
        { currency: 'USD', buyAmount: 125.5, sellAmount: 0, buyCount: 2, sellCount: 0 },
      ],
    })
  })

  it('날짜별로 따로 집계한다', () => {
    const map = summarizeDailyTrades([
      trade({ tradeDate: '2026-11-07', tradeAmount: 1 }),
      trade({ tradeDate: '2026-11-08', tradeAmount: 2 }),
    ])

    expect(map.get('2026-11-07')?.byCurrency[0].buyAmount).toBe(1)
    expect(map.get('2026-11-08')?.byCurrency[0].buyAmount).toBe(2)
  })
})
