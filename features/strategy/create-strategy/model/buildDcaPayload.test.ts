import { describe, expect, it } from 'vitest'
import { buildDcaConfig, buildDcaCreatePayload } from './buildDcaPayload'
import type { DcaFormValues, DcaRuleFormValues } from './dcaFormSchema'

const rule: DcaRuleFormValues = {
  market: 'US_STOCK', orderAmount: { min: 0, scale: 2, currency: 'USD' }, ruleKey: null, direction: 'SELL', orderType: 'MOO', executionHour: null,
  frequency: 'MONTHLY', dayOfWeek: 'TUESDAY', dayOfMonth: 'LAST',
  sizingType: 'AMOUNT', amount: 150, percent: null, shortfall: 'PARTIAL', conditions: [],
}
const form = (rules: DcaRuleFormValues[], o: Partial<DcaFormValues> = {}): DcaFormValues => ({
  market: 'US_STOCK', ticker: 'QLD', scheduledStartDate: null, initialHoldings: null, initialAvgPrice: null, rules, ...o,
})
const first = (r: Partial<DcaRuleFormValues>) => buildDcaConfig(form([{ ...rule, ...r }])).rules[0]

describe('orderAmount', () => {
  it('payload에 싣지 않는다', () => {
    expect(first({})).not.toHaveProperty('orderAmount')
    expect(buildDcaCreatePayload(form([rule])).dca?.rules[0]).not.toHaveProperty('orderAmount')
  })
})

describe('buildDcaConfig', () => {
  it('말일(LAST)은 dayOfMonth null, MONTHLY면 남은 dayOfWeek는 null', () => {
    expect(buildDcaConfig(form([rule]))).toEqual({
      rules: [{
        ruleKey: null, direction: 'SELL', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null, orderType: 'MOO',
        sizing: { type: 'AMOUNT', amount: 150, percent: null }, shortfall: 'PARTIAL', conditions: [],
      }],
    })
  })
  it('규칙 순서와 ruleKey(기존/신규 null)를 그대로 직렬화한다', () => {
    const c = buildDcaConfig(form([{ ...rule, ruleKey: 'b' }, { ...rule, ruleKey: null }]))
    expect(c.rules.map((r) => r.ruleKey)).toEqual(['b', null])
  })
  it('검증을 거치지 않은 null 금액·비율은 보내지 않고 실패', () => {
    expect(() => first({ amount: null })).toThrow()
    expect(() => first({ sizingType: 'HOLDING_PERCENT', percent: null })).toThrow()
  })
  it('AMOUNT는 percent를, HOLDING_PERCENT는 amount를 버린다', () => {
    expect(first({ amount: 15000, percent: 30 }).sizing).toEqual({ type: 'AMOUNT', amount: 15000, percent: null })
    expect(first({ sizingType: 'HOLDING_PERCENT', amount: 15000, percent: 50 }).sizing)
      .toEqual({ type: 'HOLDING_PERCENT', amount: null, percent: 50 })
  })
  it('29~31은 숫자, WEEKLY는 dayOfMonth null, DAILY는 둘 다 null', () => {
    expect(first({ dayOfMonth: '30' }).dayOfMonth).toBe(30)
    expect(first({ frequency: 'WEEKLY', dayOfMonth: '15' })).toMatchObject({ dayOfWeek: 'TUESDAY', dayOfMonth: null })
    expect(first({ frequency: 'DAILY' })).toMatchObject({ dayOfWeek: null, dayOfMonth: null })
  })
  it('SMA 조건은 smaPeriod만, 그 외는 threshold만', () => {
    expect(first({ conditions: [
      { indicator: 'SMA', operator: 'LT', threshold: 35, smaPeriod: 200 },
      { indicator: 'RSI', operator: 'LTE', threshold: 35, smaPeriod: 50 },
    ] }).conditions).toEqual([
      { indicator: 'SMA', operator: 'LT', smaPeriod: 200 },
      { indicator: 'RSI', operator: 'LTE', threshold: 35 },
    ])
  })
  it('크립토는 executionHour(00시 포함)를 보내고 주식은 키 자체가 없다', () => {
    expect(first({ market: 'CRYPTO_KRW', orderType: 'MARKET', executionHour: 0 })).toMatchObject({ executionHour: 0 })
    expect(first({ executionHour: 9 })).not.toHaveProperty('executionHour')
  })
})

describe('buildDcaCreatePayload', () => {
  it('type=DCA·ticker·dca만, 시작예정일·보유 시작값 없으면 생략하고 규칙에 ruleKey 키가 없다', () => {
    const p = buildDcaCreatePayload(form([{ ...rule, ruleKey: 'x' }]))
    expect(p).toEqual({ type: 'DCA', ticker: 'QLD', cycleSeedType: 'NONE', dca: { rules: [expect.any(Object)] } })
    expect('ruleKey' in p.dca!.rules[0]).toBe(false)
  })
  it('시작예정일 있으면 포함', () => {
    expect(buildDcaCreatePayload(form([rule], { scheduledStartDate: '2026-10-20' })).scheduledStartDate).toBe('2026-10-20')
  })
  it('수량>0이면 initialHoldings·initialAvgPrice 포함', () => {
    expect(buildDcaCreatePayload(form([rule], { initialHoldings: 10, initialAvgPrice: 50 })))
      .toMatchObject({ initialHoldings: 10, initialAvgPrice: 50 })
  })
  it.each([null, 0])('수량 %s이면 둘 다 키 없음', (q) => {
    const p = buildDcaCreatePayload(form([rule], { initialHoldings: q, initialAvgPrice: null }))
    expect(p).not.toHaveProperty('initialHoldings')
    expect(p).not.toHaveProperty('initialAvgPrice')
  })
})
