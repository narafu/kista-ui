import { describe, expect, it } from 'vitest'
import { normalizePlacedOrderBase } from './placed-order'

describe('normalizePlacedOrderBase', () => {
  it('normalizes the common placed-order fields from an unknown raw item', () => {
    const raw = {
      id: 'order-1',
      ticker: 'TQQQ',
      direction: 'BUY',
      orderType: 'LOC',
      quantity: 5,
      price: '20.00',
      status: 'PLACED',
    }

    expect(normalizePlacedOrderBase(raw)).toEqual({
      id: 'order-1',
      ticker: 'TQQQ',
      direction: 'BUY',
      orderType: 'LOC',
      quantity: 5,
      price: '20.00',
      status: 'PLACED',
    })
  })

  it('coerces numeric-looking string/number inputs the same way String()/Number() would', () => {
    const raw = {
      id: 42,
      ticker: 'SOXL',
      direction: 'SELL',
      orderType: 'MOC',
      quantity: '3',
      price: 21.5,
      status: 'FILLED',
    }

    expect(normalizePlacedOrderBase(raw)).toEqual({
      id: '42',
      ticker: 'SOXL',
      direction: 'SELL',
      orderType: 'MOC',
      quantity: 3,
      price: '21.5',
      status: 'FILLED',
    })
  })

  it('does not apply any default when status is missing (caller decides fallback)', () => {
    const raw = {
      id: 'order-2',
      ticker: 'TQQQ',
      direction: 'BUY',
      orderType: 'LOC',
      quantity: 1,
      price: '20.00',
    }

    expect(normalizePlacedOrderBase(raw).status).toBe('undefined')
  })
})
