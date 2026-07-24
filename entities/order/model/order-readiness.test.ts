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
    competition: null,
    sellSufficiency: null,
    ...overrides,
  }
}

describe('computeOrderReadiness', () => {
  it('returns all-false defaults when preview is undefined', () => {
    const result = computeOrderReadiness(undefined)

    expect(result).toEqual({
      buy: { hasOrders: false, unplaced: false, hasDeficit: false, uncertain: false, deficitAmount: 0 },
      sell: { hasOrders: false, unplaced: false, hasDeficit: false, uncertain: false, deficitAmount: 0 },
    })
  })

  it('does not mark buy as unplaced before any order has been attempted today', () => {
    const preview = basePreview({
      orders: [{ ticker: 'MAGX', orderType: 'LOC', direction: 'BUY', quantity: 1, price: '100' }],
      todayOrders: [],
      competition: {
        sufficientBudget: false, availableDeposit: '0', requiredForThisStrategy: '100',
        consumedByHigherPriority: '0', blockedByHigherPriority: [], uncertainStrategyIds: [],
        liveBalanceUnavailable: false,
      },
    })

    const result = computeOrderReadiness(preview)

    expect(result.buy.hasOrders).toBe(true)
    expect(result.buy.hasDeficit).toBe(true)
    expect(result.buy.unplaced).toBe(false)
    expect(result.buy.deficitAmount).toBe(100)
  })

  it('marks buy as unplaced when sell was placed but buy is still short on budget', () => {
    const preview = basePreview({
      orders: [
        { ticker: 'MAGX', orderType: 'LOC', direction: 'BUY', quantity: 1, price: '100' },
        { ticker: 'MAGX', orderType: 'LOC', direction: 'SELL', quantity: 1, price: '120' },
      ],
      todayOrders: [
        { id: 'o1', ticker: 'MAGX', direction: 'SELL', orderType: 'LOC', quantity: 1, price: '120', status: 'PLACED' },
      ],
      competition: {
        sufficientBudget: false, availableDeposit: '50', requiredForThisStrategy: '100',
        consumedByHigherPriority: '0', blockedByHigherPriority: [], uncertainStrategyIds: [],
        liveBalanceUnavailable: false,
      },
    })

    const result = computeOrderReadiness(preview)

    expect(result.buy.unplaced).toBe(true)
    expect(result.sell.unplaced).toBe(false)
    expect(result.buy.hasDeficit).toBe(true)
    expect(result.buy.deficitAmount).toBe(50)
  })

  it('clears the deficit once live budget becomes sufficient while buy is still unplaced', () => {
    const preview = basePreview({
      orders: [
        { ticker: 'MAGX', orderType: 'LOC', direction: 'BUY', quantity: 1, price: '100' },
        { ticker: 'MAGX', orderType: 'LOC', direction: 'SELL', quantity: 1, price: '120' },
      ],
      todayOrders: [
        { id: 'o1', ticker: 'MAGX', direction: 'SELL', orderType: 'LOC', quantity: 1, price: '120', status: 'PLACED' },
      ],
      competition: {
        sufficientBudget: true, availableDeposit: '500', requiredForThisStrategy: '100',
        consumedByHigherPriority: '0', blockedByHigherPriority: [], uncertainStrategyIds: [],
        liveBalanceUnavailable: false,
      },
    })

    const result = computeOrderReadiness(preview)

    expect(result.buy.unplaced).toBe(true)
    expect(result.buy.hasDeficit).toBe(false)
    expect(result.buy.uncertain).toBe(false)
  })

  it('flags live balance as uncertain instead of claiming the deficit is resolved', () => {
    const preview = basePreview({
      orders: [{ ticker: 'MAGX', orderType: 'LOC', direction: 'BUY', quantity: 1, price: '100' }],
      todayOrders: [
        { id: 'o1', ticker: 'MAGX', direction: 'SELL', orderType: 'LOC', quantity: 1, price: '120', status: 'PLACED' },
      ],
      competition: {
        sufficientBudget: true, availableDeposit: '0', requiredForThisStrategy: '100',
        consumedByHigherPriority: '0', blockedByHigherPriority: [], uncertainStrategyIds: [],
        liveBalanceUnavailable: true,
      },
    })

    const result = computeOrderReadiness(preview)

    expect(result.buy.hasDeficit).toBe(false)
    expect(result.buy.uncertain).toBe(true)
    expect(result.buy.unplaced).toBe(true)
  })

  it('marks both directions as not unplaced once both are placed', () => {
    const preview = basePreview({
      orders: [
        { ticker: 'MAGX', orderType: 'LOC', direction: 'BUY', quantity: 1, price: '100' },
        { ticker: 'MAGX', orderType: 'LOC', direction: 'SELL', quantity: 1, price: '120' },
      ],
      todayOrders: [
        { id: 'o1', ticker: 'MAGX', direction: 'BUY', orderType: 'LOC', quantity: 1, price: '100', status: 'PLACED' },
        { id: 'o2', ticker: 'MAGX', direction: 'SELL', orderType: 'LOC', quantity: 1, price: '120', status: 'PLACED' },
      ],
      competition: {
        sufficientBudget: true, availableDeposit: '500', requiredForThisStrategy: '100',
        consumedByHigherPriority: '0', blockedByHigherPriority: [], uncertainStrategyIds: [],
        liveBalanceUnavailable: false,
      },
    })

    const result = computeOrderReadiness(preview)

    expect(result.buy.unplaced).toBe(false)
    expect(result.sell.unplaced).toBe(false)
  })

  it('treats sell-unplaced independently of buy state', () => {
    const preview = basePreview({
      orders: [
        { ticker: 'MAGX', orderType: 'LOC', direction: 'BUY', quantity: 1, price: '100' },
        { ticker: 'MAGX', orderType: 'LOC', direction: 'SELL', quantity: 1, price: '120' },
      ],
      todayOrders: [
        { id: 'o1', ticker: 'MAGX', direction: 'BUY', orderType: 'LOC', quantity: 1, price: '100', status: 'PLACED' },
      ],
      competition: {
        sufficientBudget: true, availableDeposit: '500', requiredForThisStrategy: '100',
        consumedByHigherPriority: '0', blockedByHigherPriority: [], uncertainStrategyIds: [],
        liveBalanceUnavailable: false,
      },
    })

    const result = computeOrderReadiness(preview)

    expect(result.buy.unplaced).toBe(false)
    expect(result.sell.unplaced).toBe(true)
  })

  it('reports the sell quantity deficit when sellable quantity is insufficient', () => {
    const preview = basePreview({
      orders: [{ ticker: 'SOXL', orderType: 'LIMIT', direction: 'SELL', quantity: 9, price: '160' }],
      todayOrders: [],
      sellSufficiency: {
        sufficientQuantity: false, sellableQuantity: 6, reservedQuantity: 0,
        requiredQuantity: 9, liveQuantityUnavailable: false,
      },
    })

    const result = computeOrderReadiness(preview)

    expect(result.sell.hasDeficit).toBe(true)
    expect(result.sell.deficitAmount).toBe(3)
    expect(result.sell.uncertain).toBe(false)
  })

  it('does not report a sell quantity deficit once sellable quantity is sufficient', () => {
    const preview = basePreview({
      orders: [{ ticker: 'SOXL', orderType: 'LIMIT', direction: 'SELL', quantity: 9, price: '160' }],
      todayOrders: [],
      sellSufficiency: {
        sufficientQuantity: true, sellableQuantity: 20, reservedQuantity: 0,
        requiredQuantity: 9, liveQuantityUnavailable: false,
      },
    })

    const result = computeOrderReadiness(preview)

    expect(result.sell.hasDeficit).toBe(false)
    expect(result.sell.deficitAmount).toBe(0)
  })

  it('flags sell quantity as uncertain instead of claiming the deficit is resolved', () => {
    const preview = basePreview({
      orders: [{ ticker: 'SOXL', orderType: 'LIMIT', direction: 'SELL', quantity: 9, price: '160' }],
      todayOrders: [],
      sellSufficiency: {
        sufficientQuantity: true, sellableQuantity: 0, reservedQuantity: 0,
        requiredQuantity: 9, liveQuantityUnavailable: true,
      },
    })

    const result = computeOrderReadiness(preview)

    expect(result.sell.hasDeficit).toBe(false)
    expect(result.sell.uncertain).toBe(true)
  })
})
