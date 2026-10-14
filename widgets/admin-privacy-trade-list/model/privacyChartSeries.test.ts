import { describe, expect, it } from 'vitest'
import type { AdminPrivacyBase } from '@entities/privacy'
import type { Candle } from '@entities/market'
import { buildPrivacyChartSeries, candleRangeFor } from './privacyChartSeries'

function base(overrides: Partial<AdminPrivacyBase>): AdminPrivacyBase {
  return {
    id: 'b',
    releaseDate: '2026-07-02',
    ticker: 'SOXL',
    currentCycleStart: 1000,
    currentCycleRealizedPnl: 0,
    avgPrice: 10,
    holdings: 50,
    orders: [],
    ...overrides,
  }
}

function candle(date: string, close: number): Candle {
  return { date, open: close, high: close, low: close, close, volume: 0 }
}

describe('buildPrivacyChartSeries', () => {
  it('발표일 이전 가장 최근 종가로 현금비중을 계산한다 (같은 날 종가는 쓰지 않음)', () => {
    const { rows } = buildPrivacyChartSeries(
      [base({ releaseDate: '2026-07-02', currentCycleRealizedPnl: 100 })],
      [candle('2026-07-02', 999), candle('2026-06-30', 8), candle('2026-07-01', 12)],
    )
    // 현금 = 1000 + 100 − 10×50 = 600, 평가 = 600 + 50×12 = 1200
    expect(rows[0].close).toBe(12)
    expect(rows[0].cashRatio).toBeCloseTo(0.5)
  })

  it('종가가 없거나 보유 중인데 평단가가 없으면 현금비중은 null, 무보유면 평단가 없어도 100%', () => {
    const { rows } = buildPrivacyChartSeries(
      [
        base({ id: '1', releaseDate: '2026-07-01' }),
        base({ id: '2', releaseDate: '2026-07-03', avgPrice: null }),
        base({ id: '3', releaseDate: '2026-07-04', avgPrice: null, holdings: 0 }),
      ],
      [candle('2026-07-02', 10)],
    )
    expect(rows.map((r) => r.cashRatio)).toEqual([null, null, 1])
  })

  it('발표일 오름차순 정렬, 사이클 시작금액 변경일을 경계로 표시한다', () => {
    const { rows } = buildPrivacyChartSeries(
      [
        base({ id: '3', releaseDate: '2026-07-03', currentCycleStart: 1200 }),
        base({ id: '1', releaseDate: '2026-07-01' }),
        base({ id: '2', releaseDate: '2026-07-02' }),
      ],
      [],
    )
    expect(rows.map((r) => r.date)).toEqual(['2026-07-01', '2026-07-02', '2026-07-03'])
    expect(rows.map((r) => r.cycleBoundary)).toEqual([false, false, true])
  })

  it('주문 가격을 방향별 buyN/sellN 키로 펼치고 최대 개수를 돌려준다', () => {
    const series = buildPrivacyChartSeries(
      [
        base({
          orders: [
            { id: 'o1', direction: 'BUY', orderType: 'LOC', price: 9.5, quantity: 3 },
            { id: 'o2', direction: 'SELL', orderType: 'LIMIT', price: 11, quantity: null },
            { id: 'o3', direction: 'BUY', orderType: 'LOC', price: 9, quantity: 2 },
          ],
        }),
      ],
      [],
    )
    expect(series.rows[0]).toMatchObject({ buy0: 9.5, buy1: 9, sell0: 11 })
    expect(series.maxBuyOrders).toBe(2)
    expect(series.maxSellOrders).toBe(1)
  })
})

describe('candleRangeFor', () => {
  it('매매표가 없으면 null', () => {
    expect(candleRangeFor([])).toBeNull()
  })

  it('첫 발표일보다 10일 앞부터 마지막 발표일까지', () => {
    expect(candleRangeFor([base({ releaseDate: '2026-07-10' }), base({ releaseDate: '2026-03-01' })]))
      .toEqual({ from: '2026-02-19', to: '2026-07-10' })
  })

  it('5년을 넘으면 마지막 발표일 기준 5년으로 자른다', () => {
    expect(candleRangeFor([base({ releaseDate: '2018-01-01' }), base({ releaseDate: '2026-07-10' })]))
      .toEqual({ from: '2021-07-11', to: '2026-07-10' })
  })
})
