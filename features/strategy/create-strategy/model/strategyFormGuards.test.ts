import { describe, expect, it } from 'vitest'
import { todayKst } from '@shared/lib/format'
import { RAMP_DEFAULTS_BY_MODE, type VrRecurringMode } from '@entities/strategy'
import type { StrategyTypeMeta } from '@entities/meta'
import {
  computeCannotSubmit,
  computeVrAssets,
  computeSubmitDisabled,
  isInvalidBootstrap,
  isInvalidScheduledStart,
  isInvalidVr,
  isRuntimeValueInvalid,
} from './strategyFormGuards'
import type { VrFields } from './useStrategyForm'

type RuntimeStrategySettings = Pick<StrategyTypeMeta, 'enabled' | 'fields'>

function vrFields(overrides: Partial<VrFields> = {}): VrFields {
  return {
    avgPrice: null, quantity: null, intervalWeeks: null, bandWidth: null,
    recurringAmount: null, initialValue: null, initialGradient: null,
    gGraceWeeks: null, gStepWeeks: null, gMax: null,
    initialPoolLimitRate: null, pGraceWeeks: null, pStepWeeks: null, poolLimitFloor: null,
    ...overrides,
  }
}

// vrFields + mode → 가드 입력(자산 계산·램프 기본값), 훅이 가드에 넘기는 방식 그대로
function derive(fields: VrFields, recurringMode: VrRecurringMode, seedUsd: number | null) {
  return {
    vrAssets: computeVrAssets({ vrFields: fields, seedUsd, recurringMode }),
    rampDefaults: RAMP_DEFAULTS_BY_MODE[recurringMode],
  }
}

describe('computeVrAssets', () => {
  const assets = (fields: Partial<VrFields>, recurringMode: VrRecurringMode = 'HOLD', seedUsd: number | null = 0, initial?: never) =>
    computeVrAssets({ initial, vrFields: vrFields(fields), seedUsd, recurringMode })

  it('초기 V 입력(>0)은 게이트 자산에만 쓰고 인출식 최소 자산은 평단가 추정치만 쓴다(우회 방지)', () => {
    expect(assets({ initialValue: 3000 }, 'HOLD', 2000).initialAssets).toBe(5000)
    expect(assets({ initialValue: 0, avgPrice: 100, quantity: 10 }, 'HOLD', 0).initialAssets).toBe(1000)
    const d = assets({ initialValue: 999999, avgPrice: 1, quantity: 100 }, 'WITHDRAW', 0)
    expect(d.initialAssets).toBe(999999)
    expect(d.evaluatedAssets).toBe(100)
  })
  it('수정은 저장된 V값을 쓴다', () => {
    const initial = { id: 's', vr: { value: 4200 } } as never
    const d = assets({ avgPrice: 999, quantity: 999 }, 'HOLD', 100, initial)
    expect(d.initialAssets).toBe(4300)
    expect(d.evaluatedAssets).toBe(4300)
  })
  it('적립 방향으로 부호를 정하고 인출식 필요 자산은 |금액|×100×(4/주기), 주기가 없으면 0', () => {
    expect(assets({ recurringAmount: 250 }, 'HOLD').normalizedRecurringAmount).toBe(0)
    expect(assets({ recurringAmount: 250 }, 'DEPOSIT').normalizedRecurringAmount).toBe(250)
    expect(assets({ recurringAmount: 250 }, 'WITHDRAW').normalizedRecurringAmount).toBe(-250)
    expect(assets({ recurringAmount: -250 }, 'WITHDRAW').recurringMagnitude).toBe(250)
    expect(assets({ recurringAmount: 100, intervalWeeks: 2 }, 'WITHDRAW').requiredWithdrawalAssets).toBe(20000)
    expect(assets({ recurringAmount: 100, intervalWeeks: null }, 'WITHDRAW').requiredWithdrawalAssets).toBe(0)
  })
})

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
    isInvalidVr({ isVr: true, vrFields: fields, recurringMode: mode, ...derive(fields, mode, seedUsd) })

  it('is always false when not VR', () => {
    const f = vrFields()
    expect(isInvalidVr({ isVr: false, vrFields: f, recurringMode: 'HOLD', ...derive(f, 'HOLD', 2000) })).toBe(false)
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

describe('computeCannotSubmit vs computeSubmitDisabled non-equivalence', () => {
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
      seedCheck: 'ok' as const, seedUnavailableReason: null as string | null,
    }
    expect(computeCannotSubmit(common)).toBe(false)
    expect(computeSubmitDisabled({
      ...common, vrFields: vrFields(), recurringMode: 'HOLD', ...derive(vrFields(), 'HOLD', 100), minSeed: null,
    })?.message ?? null).toBeNull()
  })

  it('a non-VR runtime-invalid value blocks submit yet yields no disabled reason', () => {
    const common = {
      initial: undefined, canEditSeed: true, ...baseGuards, isVr: false,
      seedCheck: 'ok' as const, seedUnavailableReason: null as string | null,
    }
    // cannotSubmit ORs in isRuntimeValueInvalid ...
    expect(computeCannotSubmit({ ...common, isRuntimeValueInvalid: true })).toBe(true)
    // ... but the non-VR reason chain never inspects it → reason stays null
    const reason = computeSubmitDisabled({
      ...common, isRuntimeValueInvalid: true,
      vrFields: vrFields(), recurringMode: 'HOLD', ...derive(vrFields(), 'HOLD', 2000), minSeed: 500,
    })?.message ?? null
    expect(reason).toBeNull()
  })
})

describe('computeSubmitDisabled messages', () => {
  const create = {
    initial: undefined, canEditSeed: true, runtimeConfigUnavailable: false,
    isInvalidScheduledStart: false, isRuntimeValueInvalid: false,
    seedUnavailableReason: null as string | null, isBelowMinSeed: false, minSeed: 500,
    isInvalidSeed: false, seedCheck: 'ok' as const,
  }

  it('reports the gradient-cap message for VR', () => {
    const f = vrFields({ intervalWeeks: 4, bandWidth: 15, initialGradient: 10, gMax: 5 })
    expect(computeSubmitDisabled({
      ...create, isVr: true, vrFields: f, recurringMode: 'HOLD', ...derive(f, 'HOLD', 2000),
    })?.message ?? null).toBe('gradient 상한은 초기값 이상이어야 합니다.')
  })

  it('reports the quantity-integer message before checking VR/seed', () => {
    const f = vrFields({ avgPrice: 45.5, quantity: 10.5 })
    expect(computeSubmitDisabled({
      ...create, isVr: false, vrFields: f, recurringMode: 'HOLD', ...derive(f, 'HOLD', 2000),
    })?.message ?? null).toContain('수량은 정수여야 합니다')
  })

  it('tags field-specific reasons with their input and leaves cross-field reasons untagged', () => {
    const base = { ...create, isVr: true }
    const dep = vrFields({ intervalWeeks: 4, bandWidth: 15 })
    expect(computeSubmitDisabled({
      ...base, vrFields: dep, recurringMode: 'DEPOSIT', ...derive(dep, 'DEPOSIT', 2000),
    })).toEqual({ message: '적립금을 0보다 크게 입력하세요.', field: 'recurring' })
    const wd = vrFields({ intervalWeeks: 4, bandWidth: 15, recurringAmount: 100000 })
    const result = computeSubmitDisabled({
      ...base, vrFields: wd, recurringMode: 'WITHDRAW', ...derive(wd, 'WITHDRAW', 2000),
    })
    expect(result?.message).toContain('인출식은 초기 자산이')
    expect(result?.field).toBeNull()
  })

  it('PRIVACY 최소 시드를 판정할 서버 값이 없으면 대기·실패 사유로 막는다(서버가 검증하지 않는 규칙)', () => {
    const base = { ...create, isVr: false, vrFields: vrFields(), recurringMode: 'HOLD' as const, ...derive(vrFields(), 'HOLD', 2000) }
    expect(computeSubmitDisabled({ ...base, seedCheck: 'loading' })?.message).toBe('최소 투자금을 확인하는 중입니다.')
    expect(computeSubmitDisabled({ ...base, seedCheck: 'failed' })?.message).toBe('최소 투자금을 확인하지 못했습니다. 다시 시도해주세요.')
    const guards = {
      initial: undefined, canEditSeed: true, runtimeConfigUnavailable: false, isRuntimeValueInvalid: false,
      isInvalidBootstrap: false, isInvalidScheduledStart: false, isInvalidVr: false, isBelowMinSeed: false, isInvalidSeed: false,
    }
    expect(computeCannotSubmit({ ...guards, isVr: false, seedCheck: 'failed' })).toBe(true)
    expect(computeCannotSubmit({ ...guards, isVr: false, seedCheck: 'ok' })).toBe(false)
    // NO_PRIVACY_BASE가 판정 대기보다 먼저다
    expect(computeSubmitDisabled({ ...base, seedUnavailableReason: 'NO_PRIVACY_BASE', seedCheck: 'ok' })?.message).toBe('P 매매표가 없어 등록할 수 없습니다.')
  })
})
