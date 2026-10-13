import { describe, expect, it } from 'vitest'
import { buildDcaConfig, buildDcaCreatePayload } from './buildDcaPayload'
import type { DcaFormValues } from './dcaFormSchema'

const base: DcaFormValues = {
  ticker: 'QLD', direction: 'SELL', amountUsd: 150, orderType: 'MOO', frequency: 'MONTHLY',
  dayOfWeek: 'TUESDAY', dayOfMonth: 'LAST', scheduledStartDate: null, conditions: [],
}

describe('buildDcaConfig', () => {
  it('말일(LAST)은 dayOfMonth null, MONTHLY면 남아 있던 dayOfWeek는 null', () => {
    expect(buildDcaConfig(base)).toEqual({
      direction: 'SELL', amountUsd: 150, orderType: 'MOO', frequency: 'MONTHLY',
      dayOfWeek: null, dayOfMonth: null, conditions: [],
    })
  })
  it('검증을 거치지 않은 null 금액은 0달러로 보내지 않고 실패', () => {
    expect(() => buildDcaConfig({ ...base, amountUsd: null })).toThrow()
  })
  it('29~31은 숫자 그대로', () => {
    expect(buildDcaConfig({ ...base, dayOfMonth: '30' }).dayOfMonth).toBe(30)
  })
  it('WEEKLY면 dayOfMonth null, dayOfWeek 유지', () => {
    const c = buildDcaConfig({ ...base, frequency: 'WEEKLY', dayOfMonth: '15' })
    expect(c.dayOfWeek).toBe('TUESDAY')
    expect(c.dayOfMonth).toBeNull()
  })
  it('DAILY면 둘 다 null', () => {
    const c = buildDcaConfig({ ...base, frequency: 'DAILY' })
    expect(c.dayOfWeek).toBeNull()
    expect(c.dayOfMonth).toBeNull()
  })
  it('SMA 조건은 threshold 제외·smaPeriod만, 그 외는 smaPeriod 제외', () => {
    const c = buildDcaConfig({ ...base, conditions: [
      { indicator: 'SMA', operator: 'LT', threshold: 35, smaPeriod: 200 },
      { indicator: 'RSI', operator: 'LTE', threshold: 35, smaPeriod: 50 },
    ] })
    expect(c.conditions).toEqual([
      { indicator: 'SMA', operator: 'LT', smaPeriod: 200 },
      { indicator: 'RSI', operator: 'LTE', threshold: 35 },
    ])
  })
})

describe('buildDcaCreatePayload', () => {
  it('type=DCA·ticker·dca만, 시작예정일 없으면 생략', () => {
    expect(buildDcaCreatePayload(base)).toEqual({
      type: 'DCA', ticker: 'QLD', cycleSeedType: 'NONE', dca: buildDcaConfig(base),
    })
  })
  it('시작예정일 있으면 포함', () => {
    expect(buildDcaCreatePayload({ ...base, scheduledStartDate: '2026-10-20' }).scheduledStartDate).toBe('2026-10-20')
  })
})
