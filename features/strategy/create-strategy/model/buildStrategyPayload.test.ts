import { describe, expect, it } from 'vitest'
import type { Strategy } from '@entities/strategy'
import type { RuntimeConfig, RuntimeStrategyType } from '@entities/runtime-config'
import { buildStrategyPayload, type BuildStrategyPayloadInput } from './buildStrategyPayload'
import { computeVrDerived, type VrRecurringMode } from './vrDerived'
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

const vrRuntime: RuntimeStrategySettings = {
  enabled: true,
  fields: {
    ticker: { customizable: false, allowedValues: ['TQQQ'], defaultValue: 'TQQQ' },
    recurringMode: { customizable: true, allowedValues: ['DEPOSIT', 'HOLD', 'WITHDRAW'], defaultValue: 'HOLD' },
    bandWidth: { customizable: true, allowedValues: [10, 15, 20], defaultValue: 15 },
    intervalWeeks: { customizable: true, allowedValues: [1, 2, 4], defaultValue: 2 },
  },
}

function build(input: Partial<BuildStrategyPayloadInput> & { vrFields: VrFields; recurringMode?: VrRecurringMode; seedUsd: number | null }) {
  const { recurringMode = 'HOLD', ...rest } = input
  const vrDerived = computeVrDerived({
    initial: rest.initial,
    avgPrice: rest.vrFields.avgPrice,
    quantity: rest.vrFields.quantity,
    initialValue: rest.vrFields.initialValue,
    seedUsd: rest.seedUsd,
    recurringMode,
    recurringAmount: rest.vrFields.recurringAmount,
    intervalWeeks: rest.vrFields.intervalWeeks,
    initialGradient: rest.vrFields.initialGradient,
  })
  return buildStrategyPayload({
    type: 'INFINITE', ticker: 'TSLA', cycleSeedType: 'MAX', canEditSeed: false, isVr: false,
    usesDivisionCount: false, divisionCount: 20, divisionCountSettings: undefined,
    runtimeStrategy: undefined, scheduledStartDate: null,
    ...rest, vrDerived,
  })
}

describe('buildStrategyPayload — edit mode', () => {
  const initial = {
    id: 's', type: 'INFINITE', ticker: 'TSLA', cycleSeedType: 'MAX',
  } as unknown as Strategy

  it('omits initialUsdDeposit unless the seed is editable', () => {
    expect(build({ initial, seedUsd: 777, canEditSeed: false, vrFields: vrFields() })).toEqual({
      type: 'INFINITE', ticker: 'TSLA', cycleSeedType: 'MAX',
    })
  })
  it('includes initialUsdDeposit when the seed is editable', () => {
    expect(build({ initial, seedUsd: 1800, canEditSeed: true, cycleSeedType: 'MAX', vrFields: vrFields() })).toEqual({
      type: 'INFINITE', ticker: 'TSLA', cycleSeedType: 'MAX', initialUsdDeposit: 1800,
    })
  })
})

describe('buildStrategyPayload — create mode', () => {
  it('sends division count and seed for a non-VR strategy', () => {
    expect(build({
      seedUsd: 1200, usesDivisionCount: true, divisionCount: 20, vrFields: vrFields(),
    })).toEqual({
      type: 'INFINITE', ticker: 'TSLA', cycleSeedType: 'MAX', initialUsdDeposit: 1200, divisionCount: 20,
    })
  })

  it('sends holdings only when quantity > 0', () => {
    const withQty = build({ seedUsd: 1200, vrFields: vrFields({ avgPrice: 45.5, quantity: 10 }) })
    expect(withQty).toMatchObject({ initialHoldings: 10, initialAvgPrice: 45.5 })
    const withoutQty = build({ seedUsd: 1200, vrFields: vrFields() })
    expect(withoutQty).not.toHaveProperty('initialHoldings')
    expect(withoutQty).not.toHaveProperty('initialAvgPrice')
  })

  it('forces the fixed ticker when the runtime field is not customizable (VR)', () => {
    const payload = build({
      type: 'VR', ticker: 'TSLA', cycleSeedType: 'NONE', isVr: true, seedUsd: 2000,
      runtimeStrategy: vrRuntime, recurringMode: 'HOLD',
      vrFields: vrFields({ avgPrice: 300, quantity: 10, intervalWeeks: 4, bandWidth: 15 }),
    })
    expect(payload).toEqual({
      type: 'VR', ticker: 'TQQQ', cycleSeedType: 'NONE', initialUsdDeposit: 2000,
      initialHoldings: 10, initialAvgPrice: 300, intervalWeeks: 4, bandWidth: 15, recurringAmount: 0,
    })
  })

  it('includes initialVrValue only when a positive explicit V is entered', () => {
    const withV = build({
      type: 'VR', ticker: 'TQQQ', cycleSeedType: 'NONE', isVr: true, seedUsd: 2000,
      runtimeStrategy: vrRuntime, recurringMode: 'HOLD',
      vrFields: vrFields({ intervalWeeks: 4, bandWidth: 15, initialValue: 5000 }),
    })
    expect(withV).toMatchObject({ initialVrValue: 5000 })
    const withoutV = build({
      type: 'VR', ticker: 'TQQQ', cycleSeedType: 'NONE', isVr: true, seedUsd: 2000,
      runtimeStrategy: vrRuntime, recurringMode: 'HOLD',
      vrFields: vrFields({ intervalWeeks: 4, bandWidth: 15 }),
    })
    expect(withoutV).not.toHaveProperty('initialVrValue')
  })

  it('serializes the recurring amount with its withdrawal sign', () => {
    const payload = build({
      type: 'VR', ticker: 'TQQQ', cycleSeedType: 'NONE', isVr: true, seedUsd: 100000,
      runtimeStrategy: vrRuntime, recurringMode: 'WITHDRAW',
      vrFields: vrFields({ intervalWeeks: 2, bandWidth: 15, recurringAmount: 250 }),
    })
    expect(payload).toMatchObject({ recurringAmount: -250 })
  })

  it('includes ramp fields when provided and scheduledStartDate when set', () => {
    const payload = build({
      type: 'VR', ticker: 'TQQQ', cycleSeedType: 'NONE', isVr: true, seedUsd: 2000,
      runtimeStrategy: vrRuntime, recurringMode: 'HOLD', scheduledStartDate: '2999-01-01',
      vrFields: vrFields({
        intervalWeeks: 4, bandWidth: 15, initialGradient: 10, gGraceWeeks: 52, gStepWeeks: 26, gMax: 20,
        initialPoolLimitRate: 0.75, pGraceWeeks: 52, pStepWeeks: 26, poolLimitFloor: 0.5,
      }),
    })
    expect(payload).toMatchObject({
      scheduledStartDate: '2999-01-01', initialGradient: 10, gGraceWeeks: 52, gStepWeeks: 26, gMax: 20,
      initialPoolLimitRate: 0.75, pGraceWeeks: 52, pStepWeeks: 26, poolLimitFloor: 0.5,
    })
  })
})
