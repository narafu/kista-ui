import { describe, expect, it } from 'vitest'
import type { AdminPrivacyBase } from '@entities/privacy'
import type { Candle } from '@entities/market'
import { buildPrivacyChartSeries, candleRangeFor, sliceSeriesByRange } from './privacyChartSeries'

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

describe('누적 실현손익', () => {
  it('사이클 종료 시 시작금액 증감을 확정분으로 쌓고, 진행 중 손익을 더해 누적을 만든다', () => {
    const { rows } = buildPrivacyChartSeries(
      [
        base({ id: '1', releaseDate: '2026-03-01', currentCycleStart: 10000, currentCycleRealizedPnl: 0 }),
        base({ id: '2', releaseDate: '2026-03-02', currentCycleStart: 10000, currentCycleRealizedPnl: 300 }),
        base({ id: '3', releaseDate: '2026-03-03', currentCycleStart: 10500, currentCycleRealizedPnl: 0 }),
        base({ id: '4', releaseDate: '2026-03-04', currentCycleStart: 10500, currentCycleRealizedPnl: -100 }),
      ],
      [],
    )
    expect(rows.map((r) => [r.confirmedPnl, r.cumulativePnl])).toEqual([[0, 0], [0, 300], [500, 500], [500, 400]])
  })

  it('해를 넘긴 사이클은 이전 기준을 유지하고, 1월 첫 사이클 경계에서 1만 달러 재설정 — 직전 누적을 이어받는다', () => {
    const { rows } = buildPrivacyChartSeries(
      [
        base({ id: '1', releaseDate: '2025-12-30', currentCycleStart: 10000, currentCycleRealizedPnl: 0 }),
        base({ id: '2', releaseDate: '2025-12-31', currentCycleStart: 12000, currentCycleRealizedPnl: 200 }),
        base({ id: '3', releaseDate: '2026-01-02', currentCycleStart: 12000, currentCycleRealizedPnl: 300 }),
        base({ id: '4', releaseDate: '2026-01-08', currentCycleStart: 10000, currentCycleRealizedPnl: 0 }),
        base({ id: '5', releaseDate: '2026-01-20', currentCycleStart: 10300, currentCycleRealizedPnl: 50 }),
      ],
      [],
    )
    // 01-02는 해를 넘긴 사이클 진행 중(재설정 전) → 같은 기준. 01-08 재설정 시 직전 누적 (12000−10000)+300 = 2300 이월
    expect(rows.map((r) => [r.confirmedPnl, r.cumulativePnl])).toEqual([[0, 0], [2000, 2200], [2000, 2300], [2300, 2300], [2600, 2650]])
  })
})

describe('연초 재설정 최종 손익 추정·기간 자르기', () => {
  // 운영 실측(2026-01-05 → 01-06 재설정)과 같은 모양
  const history = [
    base({ id: '1', releaseDate: '2026-01-02', currentCycleStart: 14883.96, currentCycleRealizedPnl: 300, avgPrice: 43.36, holdings: 73 }),
    base({ id: '2', releaseDate: '2026-01-05', currentCycleStart: 14883.96, currentCycleRealizedPnl: 321.08, avgPrice: 43.36, holdings: 73 }),
    base({ id: '3', releaseDate: '2026-01-06', currentCycleStart: 10000, currentCycleRealizedPnl: 0, avgPrice: null, holdings: 0 }),
    base({ id: '4', releaseDate: '2026-01-07', currentCycleStart: 10000, currentCycleRealizedPnl: 20, avgPrice: 50, holdings: 10 }),
  ]
  const candles = [candle('2026-01-02', 47.24), candle('2026-01-05', 49.22), candle('2026-01-06', 54.01)]

  it('재설정 날 남은 수량 × (직전 거래일 종가 − 평단가)를 직전 사이클 마지막 매도 손익으로 추정해 이월한다', () => {
    const { rows } = buildPrivacyChartSeries(history, candles)
    const estimate = 73 * (49.22 - 43.36)
    expect(rows[2].resetEstimatedPnl).toBeCloseTo(estimate)
    expect(rows[2].cumulativePnl).toBeCloseTo(321.08 + estimate)
    expect(rows[3].cumulativePnl).toBeCloseTo(321.08 + estimate + 20)
    expect(rows[1].resetEstimatedPnl).toBeNull()
  })

  it('기간으로 자르면 첫날 확정 손익을 0으로 맞추고, 재설정 판정은 전체 이력 기준을 유지한다', () => {
    const { rows } = buildPrivacyChartSeries(history, candles)
    const sliced = sliceSeriesByRange(rows, '2026-01-06')
    expect(sliced.map((r) => r.date)).toEqual(['2026-01-06', '2026-01-07'])
    expect(sliced.map((r) => [r.confirmedPnl, r.cumulativePnl])).toEqual([[0, 0], [0, 20]])
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
