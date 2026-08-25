import { describe, expect, it } from 'vitest'
import type { Strategy } from '@entities/strategy'
import { computeVrDerived, type VrDerivedInput } from './vrDerived'

function baseInput(overrides: Partial<VrDerivedInput> = {}): VrDerivedInput {
  return {
    initial: undefined,
    avgPrice: null,
    quantity: null,
    initialValue: null,
    seedUsd: null,
    recurringMode: 'HOLD',
    recurringAmount: null,
    intervalWeeks: null,
    initialGradient: null,
    gMax: null,
    initialPoolLimitRate: null,
    poolLimitFloor: null,
    ...overrides,
  }
}

describe('computeVrDerived', () => {
  it('estimates evaluated stock value as avgPrice * quantity (0 when either is null)', () => {
    expect(computeVrDerived(baseInput({ avgPrice: 100, quantity: 10 })).evaluatedStockValueEstimate).toBe(1000)
    expect(computeVrDerived(baseInput({ avgPrice: 100, quantity: null })).evaluatedStockValueEstimate).toBe(0)
  })

  it('prefers an explicit positive initialValue for normalizedInitialValue, otherwise the estimate', () => {
    expect(computeVrDerived(baseInput({ initialValue: 5000, avgPrice: 100, quantity: 10 })).normalizedInitialValue).toBe(5000)
    expect(computeVrDerived(baseInput({ initialValue: 0, avgPrice: 100, quantity: 10 })).normalizedInitialValue).toBe(1000)
    expect(computeVrDerived(baseInput({ initialValue: null, avgPrice: 100, quantity: 10 })).normalizedInitialValue).toBe(1000)
  })

  it('uses the persisted V value in edit mode for normalizedInitialValue', () => {
    const initial = { vr: { value: 4200 } } as unknown as Strategy
    expect(computeVrDerived(baseInput({ initial, avgPrice: 999, quantity: 999 })).normalizedInitialValue).toBe(4200)
  })

  it('signs the recurring amount by mode', () => {
    expect(computeVrDerived(baseInput({ recurringMode: 'HOLD', recurringAmount: 250 })).normalizedRecurringAmount).toBe(0)
    expect(computeVrDerived(baseInput({ recurringMode: 'DEPOSIT', recurringAmount: 250 })).normalizedRecurringAmount).toBe(250)
    expect(computeVrDerived(baseInput({ recurringMode: 'WITHDRAW', recurringAmount: 250 })).normalizedRecurringAmount).toBe(-250)
    // magnitude is always the absolute value
    expect(computeVrDerived(baseInput({ recurringMode: 'WITHDRAW', recurringAmount: -250 })).recurringMagnitude).toBe(250)
  })

  it('derives ramp defaults from recurringMode alone — amount magnitude (even 0) never flips the bucket', () => {
    expect(computeVrDerived(baseInput({ recurringMode: 'DEPOSIT', recurringAmount: 0 })).effectiveInitialGradient).toBe(10)
    expect(computeVrDerived(baseInput({ recurringMode: 'DEPOSIT', recurringAmount: 100 })).effectiveInitialGradient).toBe(10)
    expect(computeVrDerived(baseInput({ recurringMode: 'HOLD' })).effectiveInitialGradient).toBe(10)
    expect(computeVrDerived(baseInput({ recurringMode: 'WITHDRAW', recurringAmount: 0 })).effectiveInitialGradient).toBe(40)
    expect(computeVrDerived(baseInput({ recurringMode: 'WITHDRAW', recurringAmount: 100 })).effectiveInitialGradient).toBe(40)
    expect(computeVrDerived(baseInput({ initialGradient: 7 })).effectiveInitialGradient).toBe(7)
  })

  it('applies the fixed ramp table per mode (적립 100%/50%, 거치 75%/50%, 인출 10%/10%, gMax 20/20/50) and respects explicit overrides', () => {
    expect(computeVrDerived(baseInput({ recurringMode: 'DEPOSIT', recurringAmount: 100 })).effectiveInitialPoolLimitRate).toBe(1.0)
    expect(computeVrDerived(baseInput({ recurringMode: 'DEPOSIT', recurringAmount: 100 })).effectivePoolLimitFloor).toBe(0.5)
    expect(computeVrDerived(baseInput({ recurringMode: 'DEPOSIT', recurringAmount: 100 })).effectiveGMax).toBe(20)
    expect(computeVrDerived(baseInput({ recurringMode: 'HOLD' })).effectiveInitialPoolLimitRate).toBe(0.75)
    expect(computeVrDerived(baseInput({ recurringMode: 'HOLD' })).effectivePoolLimitFloor).toBe(0.5)
    expect(computeVrDerived(baseInput({ recurringMode: 'HOLD' })).effectiveGMax).toBe(20)
    expect(computeVrDerived(baseInput({ recurringMode: 'WITHDRAW', recurringAmount: 100 })).effectiveInitialPoolLimitRate).toBe(0.1)
    expect(computeVrDerived(baseInput({ recurringMode: 'WITHDRAW', recurringAmount: 100 })).effectivePoolLimitFloor).toBe(0.1)
    expect(computeVrDerived(baseInput({ recurringMode: 'WITHDRAW', recurringAmount: 100 })).effectiveGMax).toBe(50)
    expect(computeVrDerived(baseInput({ gMax: 30 })).effectiveGMax).toBe(30)
    expect(computeVrDerived(baseInput({ poolLimitFloor: 0.2 })).effectivePoolLimitFloor).toBe(0.2)
  })

  it('combines V value and seed into initialAssets', () => {
    expect(computeVrDerived(baseInput({ initialValue: 3000, seedUsd: 2000 })).initialAssets).toBe(5000)
  })

  it('evaluatedAssets always uses the real estimate, never the override — withdrawal safety invariant', () => {
    // explicit initial V is large, but there is no real position → evaluatedAssets stays at just the seed
    const d = computeVrDerived(baseInput({ initialValue: 100000, avgPrice: null, quantity: null, seedUsd: 100 }))
    expect(d.evaluatedAssets).toBe(100)
    // with a real position, the estimate contributes
    const d2 = computeVrDerived(baseInput({ initialValue: 0, avgPrice: 100, quantity: 190, seedUsd: 1000 }))
    expect(d2.evaluatedAssets).toBe(20000)
  })

  it('computes requiredWithdrawalAssets as |amount| * 100 * (4 / intervalWeeks), 0 without a positive interval', () => {
    expect(computeVrDerived(baseInput({ recurringMode: 'WITHDRAW', recurringAmount: 100, intervalWeeks: 2 })).requiredWithdrawalAssets).toBe(20000)
    expect(computeVrDerived(baseInput({ recurringMode: 'WITHDRAW', recurringAmount: 100, intervalWeeks: null })).requiredWithdrawalAssets).toBe(0)
  })
})
