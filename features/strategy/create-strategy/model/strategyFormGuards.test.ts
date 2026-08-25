import { describe, expect, it } from 'vitest'
import { todayKst } from '@shared/lib/format'
import type { RuntimeConfig, RuntimeStrategyType } from '@entities/runtime-config'
import {
  computeCannotSubmit,
  computeSubmitDisabledReason,
  isInvalidBootstrap,
  isInvalidScheduledStart,
  isInvalidVr,
  isRuntimeValueInvalid,
} from './strategyFormGuards'
import { computeVrDerived, type VrDerivedInput, type VrRecurringMode } from './vrDerived'
import type { VrFields } from './useStrategyForm'

type RuntimeStrategySettings = RuntimeConfig['strategies'][RuntimeStrategyType]

function vrFields(overrides: Partial<VrFields> = {}): VrFields {
  return {
    avgPrice: null, quantity: null, intervalWeeks: null, bandWidth: null,
    recurringAmount: null, initialValue: null, initialGradient: null,
    gGraceWeeks: null, gStepWeeks: null, gMax: null,
    initialPoolLimitRate: null, pGraceWeeks: null, pStepWeeks: null, poolLimitFloor: null,
    ...overrides,
  }
}

// vrFields + mode → VrDerived, mirroring how the hook feeds the guards
function derive(fields: VrFields, recurringMode: VrRecurringMode, seedUsd: number | null): ReturnType<typeof computeVrDerived> {
  const input: VrDerivedInput = {
    initial: undefined,
    avgPrice: fields.avgPrice,
    quantity: fields.quantity,
    initialValue: fields.initialValue,
    seedUsd,
    recurringMode,
    recurringAmount: fields.recurringAmount,
    intervalWeeks: fields.intervalWeeks,
    initialGradient: fields.initialGradient,
    gMax: fields.gMax,
    initialPoolLimitRate: fields.initialPoolLimitRate,
    poolLimitFloor: fields.poolLimitFloor,
  }
  return computeVrDerived(input)
}

const vrRuntime: RuntimeStrategySettings = {
  enabled: true,
  fields: {
    ticker: { customizable: false, allowedValues: ['TQQQ'], defaultValue: 'TQQQ' },
    recurringMode: { customizable: true, allowedValues: ['DEPOSIT', 'HOLD', 'WITHDRAW'], defaultValue: 'HOLD' },
    bandWidth: { customizable: true, allowedValues: [10, 15, 20], defaultValue: 15 },
    intervalWeeks: { customizable: true, allowedValues: [1, 2, 4], defaultValue: 2 },
  },
}

describe('isInvalidBootstrap', () => {
  it('is false in edit mode regardless of holdings input', () => {
    const initial = { id: 's' } as never
    expect(isInvalidBootstrap({ initial, avgPrice: -5, quantity: -5 })).toBe(false)
  })
  it('flags negative avgPrice or quantity individually', () => {
    expect(isInvalidBootstrap({ avgPrice: 0, quantity: -5 })).toBe(true)
    expect(isInvalidBootstrap({ avgPrice: -1, quantity: 0 })).toBe(true)
  })
  it('requires both sides when one is entered', () => {
    expect(isInvalidBootstrap({ avgPrice: null, quantity: 10 })).toBe(true)
    expect(isInvalidBootstrap({ avgPrice: 45.5, quantity: null })).toBe(true)
    expect(isInvalidBootstrap({ avgPrice: 45.5, quantity: 10 })).toBe(false)
  })
  it('rejects a fractional quantity', () => {
    expect(isInvalidBootstrap({ avgPrice: 45.5, quantity: 10.5 })).toBe(true)
  })
})

describe('isInvalidScheduledStart', () => {
  it('blocks a past date but allows today and future in create mode', () => {
    const [y, m, d] = todayKst().split('-').map(Number)
    const past = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10)
    expect(isInvalidScheduledStart({ scheduledStartDate: past })).toBe(true)
    expect(isInvalidScheduledStart({ scheduledStartDate: todayKst() })).toBe(false)
    expect(isInvalidScheduledStart({ scheduledStartDate: null })).toBe(false)
  })
  it('never blocks in edit mode', () => {
    const initial = { id: 's' } as never
    expect(isInvalidScheduledStart({ initial, scheduledStartDate: '2000-01-01' })).toBe(false)
  })
})

describe('isInvalidVr', () => {
  const run = (fields: VrFields, mode: VrRecurringMode, seedUsd: number | null) =>
    isInvalidVr({ isVr: true, vrFields: fields, recurringMode: mode, vrDerived: derive(fields, mode, seedUsd) })

  it('is always false when not VR', () => {
    const f = vrFields()
    expect(isInvalidVr({ isVr: false, vrFields: f, recurringMode: 'HOLD', vrDerived: derive(f, 'HOLD', 2000) })).toBe(false)
  })
  it('requires a valid integer interval and positive band width', () => {
    expect(run(vrFields({ intervalWeeks: 4, bandWidth: null }), 'DEPOSIT', 2000)).toBe(true)
    expect(run(vrFields({ intervalWeeks: 4.5, bandWidth: 15, recurringAmount: 200 }), 'DEPOSIT', 2000)).toBe(true)
  })
  it('allows zero initial assets for accumulation but blocks hold/withdraw at zero', () => {
    expect(run(vrFields({ intervalWeeks: 2, bandWidth: 15, recurringAmount: 200 }), 'DEPOSIT', 0)).toBe(false)
    expect(run(vrFields({ intervalWeeks: 2, bandWidth: 15, recurringAmount: 0 }), 'HOLD', 0)).toBe(true)
  })
  it('enforces the withdrawal minimum-assets floor from real evaluated assets', () => {
    // seed 1000, qty*price 1000 → evaluatedAssets 2000 < required 20000
    expect(run(vrFields({ avgPrice: 100, quantity: 10, intervalWeeks: 2, bandWidth: 15, recurringAmount: -100 }), 'WITHDRAW', 1000)).toBe(true)
    // qty 190 → 19000 + 1000 = 20000 >= 20000
    expect(run(vrFields({ avgPrice: 100, quantity: 190, intervalWeeks: 2, bandWidth: 15, recurringAmount: -100 }), 'WITHDRAW', 1000)).toBe(false)
  })
  it('blocks when an active gradient ramp cap is below the effective initial gradient', () => {
    expect(run(vrFields({ intervalWeeks: 4, bandWidth: 15, initialGradient: 10, gStepWeeks: 26, gMax: 5 }), 'HOLD', 2000)).toBe(true)
    expect(run(vrFields({ intervalWeeks: 4, bandWidth: 15, initialGradient: 10, gStepWeeks: 0, gMax: 0 }), 'HOLD', 2000)).toBe(false)
  })
})

describe('isRuntimeValueInvalid', () => {
  it('flags a band width outside the allowed list for VR', () => {
    expect(isRuntimeValueInvalid({
      runtimeStrategy: vrRuntime, ticker: 'TQQQ', divisionCountSettings: undefined,
      divisionCount: 1, isVr: true, bandWidth: 99, intervalWeeks: 2, recurringMode: 'HOLD',
    })).toBe(true)
  })
  it('is false in edit mode', () => {
    const initial = { id: 's' } as never
    expect(isRuntimeValueInvalid({
      initial, runtimeStrategy: vrRuntime, ticker: 'ZZZ', divisionCountSettings: undefined,
      divisionCount: 1, isVr: true, bandWidth: 99, intervalWeeks: 2, recurringMode: 'HOLD',
    })).toBe(false)
  })
})

describe('computeCannotSubmit vs computeSubmitDisabledReason non-equivalence', () => {
  const baseGuards = {
    runtimeConfigUnavailable: false,
    isInvalidBootstrap: false,
    isInvalidScheduledStart: false,
    isInvalidVr: false,
    isBelowMinSeed: false,
    isInvalidSeed: false,
  }

  it('edit + read-only seed can never submit and has no reason', () => {
    const initial = { id: 's' } as never
    const common = {
      initial, canEditSeed: false, ...baseGuards, isRuntimeValueInvalid: false, isVr: false,
      basePrice: 100 as number | null, seedUnavailableReason: null as string | null,
    }
    expect(computeCannotSubmit(common)).toBe(false)
    expect(computeSubmitDisabledReason({
      ...common, vrFields: vrFields(), recurringMode: 'HOLD', vrDerived: derive(vrFields(), 'HOLD', 100), minSeed: null,
    })).toBeNull()
  })

  it('a non-VR runtime-invalid value blocks submit yet yields no disabled reason', () => {
    const common = {
      initial: undefined, canEditSeed: true, ...baseGuards, isVr: false,
      basePrice: 100 as number | null, seedUnavailableReason: null as string | null,
    }
    // cannotSubmit ORs in isRuntimeValueInvalid ...
    expect(computeCannotSubmit({ ...common, isRuntimeValueInvalid: true })).toBe(true)
    // ... but the non-VR reason chain never inspects it → reason stays null
    const reason = computeSubmitDisabledReason({
      ...common, isRuntimeValueInvalid: true,
      vrFields: vrFields(), recurringMode: 'HOLD', vrDerived: derive(vrFields(), 'HOLD', 2000), minSeed: 500,
    })
    expect(reason).toBeNull()
  })
})

describe('computeSubmitDisabledReason messages', () => {
  const create = {
    initial: undefined, canEditSeed: true, runtimeConfigUnavailable: false,
    isInvalidScheduledStart: false, isRuntimeValueInvalid: false,
    seedUnavailableReason: null as string | null, isBelowMinSeed: false, minSeed: 500,
    isInvalidSeed: false, basePrice: 100 as number | null,
  }

  it('reports the gradient-cap message for VR', () => {
    const f = vrFields({ intervalWeeks: 4, bandWidth: 15, initialGradient: 10, gMax: 5 })
    expect(computeSubmitDisabledReason({
      ...create, isVr: true, vrFields: f, recurringMode: 'HOLD', vrDerived: derive(f, 'HOLD', 2000),
    })).toBe('gradient 상한은 초기값 이상이어야 합니다.')
  })

  it('reports the quantity-integer message before checking VR/seed', () => {
    const f = vrFields({ avgPrice: 45.5, quantity: 10.5 })
    expect(computeSubmitDisabledReason({
      ...create, isVr: false, vrFields: f, recurringMode: 'HOLD', vrDerived: derive(f, 'HOLD', 2000),
    })).toContain('수량은 정수여야 합니다')
  })
})
