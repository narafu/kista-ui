import { describe, expect, it } from 'vitest'
import { dcaFormSchema, type DcaFormValues } from './dcaFormSchema'

const base: DcaFormValues = {
  ticker: 'UPRO', direction: 'BUY', amountUsd: 300, orderType: 'MOC', frequency: 'DAILY',
  dayOfWeek: null, dayOfMonth: null, scheduledStartDate: null, conditions: [],
}

const ok = (v: Partial<DcaFormValues>) => dcaFormSchema.safeParse({ ...base, ...v }).success

describe('dcaFormSchema', () => {
  it('기본값 통과', () => expect(ok({})).toBe(true))
  it('금액 0·null 거부', () => {
    expect(ok({ amountUsd: 0 })).toBe(false)
    expect(ok({ amountUsd: null })).toBe(false)
  })
  it('WEEKLY는 요일 필수', () => {
    expect(ok({ frequency: 'WEEKLY' })).toBe(false)
    expect(ok({ frequency: 'WEEKLY', dayOfWeek: 'MONDAY' })).toBe(true)
  })
  it('MONTHLY는 날짜 필수 (LAST 또는 1~31)', () => {
    expect(ok({ frequency: 'MONTHLY' })).toBe(false)
    expect(ok({ frequency: 'MONTHLY', dayOfMonth: 'LAST' })).toBe(true)
    expect(ok({ frequency: 'MONTHLY', dayOfMonth: '31' })).toBe(true)
  })
  it('RSI·FEAR_GREED는 0~100', () => {
    expect(ok({ conditions: [{ indicator: 'RSI', operator: 'LTE', threshold: 101, smaPeriod: null }] })).toBe(false)
    expect(ok({ conditions: [{ indicator: 'FEAR_GREED', operator: 'LTE', threshold: -1, smaPeriod: null }] })).toBe(false)
    expect(ok({ conditions: [{ indicator: 'RSI', operator: 'LTE', threshold: 35, smaPeriod: null }] })).toBe(true)
  })
  it('AVG_PRICE는 숫자 필수, 음수 허용', () => {
    expect(ok({ conditions: [{ indicator: 'AVG_PRICE', operator: 'LTE', threshold: null, smaPeriod: null }] })).toBe(false)
    expect(ok({ conditions: [{ indicator: 'AVG_PRICE', operator: 'LTE', threshold: -5, smaPeriod: null }] })).toBe(true)
  })
  it('SMA는 기간 필수, threshold 무관', () => {
    expect(ok({ conditions: [{ indicator: 'SMA', operator: 'LT', threshold: null, smaPeriod: null }] })).toBe(false)
    expect(ok({ conditions: [{ indicator: 'SMA', operator: 'LT', threshold: 999, smaPeriod: 200 }] })).toBe(true)
  })
})
