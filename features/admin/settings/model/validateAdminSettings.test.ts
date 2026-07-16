import { describe, expect, it } from 'vitest'
import type { RuntimeConfig } from '@entities/runtime-config'
import { validateAdminSettings } from './validateAdminSettings'

const valid: RuntimeConfig = {
  auth: { approvalRequired: true },
  brokers: { KIS: { enabled: true }, TOSS: { enabled: true } },
  strategies: {
    INFINITE: { enabled: true, fields: {
      ticker: { customizable: true, allowedValues: ['SOXL'], defaultValue: 'SOXL' },
      divisionCount: { customizable: true, allowedValues: [20], defaultValue: 20 },
    } },
    PRIVACY: { enabled: true, fields: {
      ticker: { customizable: false, allowedValues: ['SOXL'], defaultValue: 'SOXL' },
    } },
    VR: { enabled: true, fields: {
      ticker: { customizable: false, allowedValues: ['TQQQ'], defaultValue: 'TQQQ' },
      recurringMode: { customizable: true, allowedValues: ['DEPOSIT', 'HOLD', 'WITHDRAW'], defaultValue: 'HOLD' },
      bandWidth: { customizable: true, allowedValues: [10], defaultValue: 10 },
      intervalWeeks: { customizable: true, allowedValues: [2], defaultValue: 2 },
    } },
  },
}

describe('validateAdminSettings', () => {
  it('accepts a complete valid document', () => expect(validateAdminSettings(valid)).toEqual({}))
  it('rejects empty allowed values', () => {
    const value = structuredClone(valid)
    value.strategies.INFINITE.fields.ticker.allowedValues = []
    expect(validateAdminSettings(value)).toMatchObject({ 'INFINITE.ticker': expect.any(String) })
  })
  it('requires the default in allowed values', () => {
    const value = structuredClone(valid)
    value.strategies.VR.fields.bandWidth!.defaultValue = 15
    expect(validateAdminSettings(value)).toMatchObject({ 'VR.bandWidth': expect.any(String) })
  })
  it('requires a fixed field to contain only its default', () => {
    const value = structuredClone(valid)
    value.strategies.PRIVACY.fields.ticker.allowedValues.push('TQQQ')
    expect(validateAdminSettings(value)).toMatchObject({ 'PRIVACY.ticker': expect.any(String) })
  })
  it('requires a fixed recurring mode to be HOLD only', () => {
    const value = structuredClone(valid)
    value.strategies.VR.fields.recurringMode = { customizable: false, allowedValues: ['DEPOSIT'], defaultValue: 'DEPOSIT' }
    expect(validateAdminSettings(value)).toMatchObject({ 'VR.recurringMode': expect.any(String) })
  })
})
