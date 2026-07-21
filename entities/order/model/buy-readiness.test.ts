import { describe, expect, it } from 'vitest'
import { computeBuyReadiness } from './buy-readiness'
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
    ...overrides,
  }
}

describe('computeBuyReadiness', () => {
  it('returns all-false defaults when preview is undefined', () => {
    const result = computeBuyReadiness(undefined)

    expect(result).toEqual({
      hasBuyOrders: false,
      hasDeficit: false,
      buyUnplaced: false,
      sellUnplaced: false,
      liveBalanceUncertain: false,
      deficitUsd: 0,
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

    const result = computeBuyReadiness(preview)

    expect(result.hasBuyOrders).toBe(true)
    expect(result.hasDeficit).toBe(true)
    expect(result.buyUnplaced).toBe(false)
    expect(result.deficitUsd).toBe(100)
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

    const result = computeBuyReadiness(preview)

    expect(result.buyUnplaced).toBe(true)
    expect(result.sellUnplaced).toBe(false)
    expect(result.hasDeficit).toBe(true)
    expect(result.deficitUsd).toBe(50)
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

    const result = computeBuyReadiness(preview)

    expect(result.buyUnplaced).toBe(true)
    expect(result.hasDeficit).toBe(false)
    expect(result.liveBalanceUncertain).toBe(false)
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

    const result = computeBuyReadiness(preview)

    expect(result.hasDeficit).toBe(false)
    expect(result.liveBalanceUncertain).toBe(true)
    expect(result.buyUnplaced).toBe(true)
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

    const result = computeBuyReadiness(preview)

    expect(result.buyUnplaced).toBe(false)
    expect(result.sellUnplaced).toBe(false)
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

    const result = computeBuyReadiness(preview)

    expect(result.buyUnplaced).toBe(false)
    expect(result.sellUnplaced).toBe(true)
  })
})
