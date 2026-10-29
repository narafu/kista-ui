import { describe, expect, it } from 'vitest'
import { computeOrderReadiness } from './order-readiness'
import type { NextOrderPreview } from './types'

function basePreview(overrides: Partial<NextOrderPreview>): NextOrderPreview {
  return {
    tradeDate: '2026-07-21',
    position: null,
    orders: [],
    skipReason: null,
    todayOrders: [],
    otherStrategiesPlannedBuyUsd: '0',
    ledgerCheck: null,
    accountCashCheck: null,
    ...overrides,
  }
}

const BUY = { ticker: 'MAGX', orderType: 'LOC', direction: 'BUY', quantity: 1, price: '100' }
const SELL = { ticker: 'MAGX', orderType: 'LOC', direction: 'SELL', quantity: 1, price: '120' }
const PLACED_SELL = { id: 'o1', ticker: 'MAGX', direction: 'SELL', orderType: 'LOC', quantity: 1, price: '120', status: 'PLACED' } as const
const SHORT = { remainingLedger: 50, requiredBuyUsd: 100, sufficient: false, trimmed: false }

describe('computeOrderReadiness', () => {
  it('returns all-false defaults when preview is undefined', () => {
    expect(computeOrderReadiness(undefined)).toEqual({
      buy: { hasOrders: false, unplaced: false },
      sell: { hasOrders: false, unplaced: false },
      ledgerShortfall: null,
      ledgerTrimmed: false,
      accountCashShortfall: null,
    })
  })

  it('does not mark buy as unplaced before any order has been attempted today', () => {
    const result = computeOrderReadiness(basePreview({ orders: [BUY], ledgerCheck: SHORT }))

    expect(result.buy.hasOrders).toBe(true)
    expect(result.buy.unplaced).toBe(false)
    expect(result.ledgerShortfall).toEqual(SHORT)
  })

  it('marks buy as unplaced when sell was placed but buy is not', () => {
    const result = computeOrderReadiness(basePreview({ orders: [BUY, SELL], todayOrders: [PLACED_SELL], ledgerCheck: SHORT }))

    expect(result.buy.unplaced).toBe(true)
    expect(result.sell.unplaced).toBe(false)
    expect(result.ledgerShortfall).toEqual(SHORT)
  })

  it('marks sell as unplaced when only buy was placed', () => {
    const result = computeOrderReadiness(basePreview({
      orders: [BUY, SELL],
      todayOrders: [{ ...PLACED_SELL, direction: 'BUY' }],
    }))

    expect(result.sell.unplaced).toBe(true)
    expect(result.buy.unplaced).toBe(false)
  })

  it('ignores ledger shortfall when no buy order is planned', () => {
    const result = computeOrderReadiness(basePreview({ orders: [SELL], ledgerCheck: SHORT }))

    expect(result.ledgerShortfall).toBeNull()
  })

  it('reports trimmed only when ledger is sufficient and buy is planned', () => {
    const trimmed = { remainingLedger: 80, requiredBuyUsd: 100, sufficient: true, trimmed: true }

    expect(computeOrderReadiness(basePreview({ orders: [BUY], ledgerCheck: trimmed })).ledgerTrimmed).toBe(true)
    expect(computeOrderReadiness(basePreview({ orders: [BUY], ledgerCheck: { ...trimmed, sufficient: false } })).ledgerTrimmed).toBe(false)
    expect(computeOrderReadiness(basePreview({ orders: [SELL], ledgerCheck: trimmed })).ledgerTrimmed).toBe(false)
  })

  it('reports account cash shortfall only when buy is planned and the ledger did not reject it', () => {
    const cashShort = { availableUsd: 300, requiredBuyUsd: 1000, sufficient: false }

    expect(computeOrderReadiness(basePreview({ orders: [BUY], accountCashCheck: cashShort })).accountCashShortfall).toEqual(cashShort)
    expect(computeOrderReadiness(basePreview({ orders: [BUY], accountCashCheck: { ...cashShort, sufficient: true } })).accountCashShortfall).toBeNull()
    // 계좌 단위 값이라 BUY 계획이 없는 전략에는 경고를 붙이지 않는다
    expect(computeOrderReadiness(basePreview({ orders: [SELL], accountCashCheck: cashShort })).accountCashShortfall).toBeNull()
    // 원장 거절이면 BUY가 증권사로 나가지 않는다
    expect(computeOrderReadiness(basePreview({ orders: [BUY], ledgerCheck: SHORT, accountCashCheck: cashShort })).accountCashShortfall).toBeNull()
  })
})
