import { describe, expect, it } from 'vitest'
import type { Strategy } from '@entities/strategy'
import { todayKst } from '@shared/lib/format'
import { testOrderAmount } from '../sections/__fixtures__/dcaTestMeta'
import {
  buildDcaFormDefaults, buildDcaRuleDefaults, dcaFormSchema, dcaRuleSchema, MAX_DCA_RULES,
  type DcaFormValues, type DcaRuleFormValues,
} from './dcaFormSchema'

const rule: DcaRuleFormValues = {
  market: 'US_STOCK', orderAmount: testOrderAmount('US_STOCK'), ruleKey: null, direction: 'BUY', orderType: 'MOC', executionHour: null,
  frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null,
  sizingType: 'AMOUNT', amount: 300, percent: null, shortfall: 'PARTIAL', conditions: [],
}
const base: DcaFormValues = {
  market: 'US_STOCK', ticker: 'UPRO', scheduledStartDate: null, initialHoldings: null, initialAvgPrice: null, rules: [rule],
}

const ok = (v: Partial<DcaRuleFormValues>) => dcaRuleSchema.safeParse({ ...rule, ...v }).success
const ruleIssue = (v: Partial<DcaRuleFormValues>, path: string) => {
  const r = dcaRuleSchema.safeParse({ ...rule, ...v })
  return r.success ? undefined : r.error.issues.find((i) => i.path.join('.') === path)?.message
}
const formIssue = (v: Partial<DcaFormValues>, path: string) => {
  const r = dcaFormSchema.safeParse({ ...base, ...v })
  return r.success ? undefined : r.error.issues.find((i) => i.path.join('.') === path)?.message
}
const formOk = (v: Partial<DcaFormValues>) => dcaFormSchema.safeParse({ ...base, ...v }).success
const cond = { indicator: 'RSI' as const, operator: 'LTE' as const, threshold: 35, smaPeriod: null }
const cryptoRule: DcaRuleFormValues = { ...rule, market: 'CRYPTO_KRW', orderAmount: testOrderAmount('CRYPTO_KRW'), orderType: 'MARKET', amount: 5000, executionHour: 9 }

describe('dcaRuleSchema', () => {
  it('기본값 통과', () => expect(ok({})).toBe(true))
  it('금액 0·null 거부', () => {
    expect(ok({ amount: 0 })).toBe(false)
    expect(ruleIssue({ amount: null }, 'amount')).toBe('금액을 입력하세요.')
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
  it.each(['0', '32', 'abc', '1.5'])('dayOfMonth "%s"는 거부', (v) => {
    expect(ruleIssue({ frequency: 'MONTHLY', dayOfMonth: v }, 'dayOfMonth')).toBe('1~31일 또는 말일을 선택하세요.')
  })
  it('빈 날짜는 선택 메시지', () => {
    for (const v of ['', null]) expect(ruleIssue({ frequency: 'MONTHLY', dayOfMonth: v }, 'dayOfMonth')).toBe('날짜를 선택하세요.')
  })
  it('RSI·FEAR_GREED는 0~100', () => {
    expect(ok({ conditions: [{ ...cond, threshold: 101 }] })).toBe(false)
    expect(ok({ conditions: [{ ...cond, indicator: 'FEAR_GREED', threshold: -1 }] })).toBe(false)
    expect(ok({ conditions: [cond] })).toBe(true)
  })
  it('AVG_PRICE는 숫자 필수, -100 초과', () => {
    const avg = { ...cond, indicator: 'AVG_PRICE' as const }
    expect(ok({ conditions: [{ ...avg, threshold: null }] })).toBe(false)
    expect(ok({ conditions: [{ ...avg, threshold: -5 }] })).toBe(true)
    expect(ok({ conditions: [{ ...avg, threshold: -100 }] })).toBe(false)
  })
  it('SMA는 기간 필수', () => {
    const sma = { ...cond, indicator: 'SMA' as const, operator: 'LT' as const }
    expect(ok({ conditions: [{ ...sma, threshold: null, smaPeriod: null }] })).toBe(false)
    expect(ok({ conditions: [{ ...sma, threshold: 999, smaPeriod: 200 }] })).toBe(true)
  })
  it('기준값은 소수 둘째 자리까지', () => {
    expect(ok({ conditions: [{ ...cond, threshold: 35.123 }] })).toBe(false)
    expect(ok({ conditions: [{ ...cond, threshold: 35.12 }] })).toBe(true)
  })
  it('조건은 최대 10개', () => {
    expect(ok({ conditions: Array(10).fill(cond) })).toBe(true)
    expect(ok({ conditions: Array(11).fill(cond) })).toBe(false)
  })

  describe('크립토', () => {
    const c = (v: Partial<DcaRuleFormValues>) => ({ ...cryptoRule, ...v })
    const issue = (v: Partial<DcaRuleFormValues>, path: string) => {
      const r = dcaRuleSchema.safeParse(c(v))
      return r.success ? undefined : r.error.issues.find((i) => i.path.join('.') === path)?.message
    }
    it('5,000원 통과, 미만·소수 거부', () => {
      expect(dcaRuleSchema.safeParse(cryptoRule).success).toBe(true)
      expect(issue({ amount: 4999 }, 'amount')).toBe('최소 주문 금액은 5,000원입니다.')
      expect(issue({ amount: 5000.5 }, 'amount')).toBe('원 단위 정수로 입력하세요.')
    })
    it('USDT는 소수 둘째 자리·최소 금액을 따른다', () => {
      const usdt = { market: 'CRYPTO_USDT' as const, orderAmount: { min: 5, scale: 2, currency: 'USDT' as const } }
      expect(dcaRuleSchema.safeParse(c({ ...usdt, amount: 10.5 })).success).toBe(true)
      expect(issue({ ...usdt, amount: 10.555 }, 'amount')).toBe('소수 둘째 자리까지 입력하세요.')
      expect(issue({ ...usdt, amount: 4.99 }, 'amount')).toBe('최소 주문 금액은 5.00 USDT입니다.')
      expect(dcaRuleSchema.safeParse(c({ ...usdt, orderAmount: { ...usdt.orderAmount, min: 0 }, amount: 0.01 })).success).toBe(true)
    })
    it('실행 시각 00시 유효, null 거부', () => {
      expect(dcaRuleSchema.safeParse(c({ executionHour: 0 })).success).toBe(true)
      expect(issue({ executionHour: null }, 'executionHour')).toBe('실행 시각을 선택하세요.')
    })
    it('시장가만 허용, 주말 요일 허용', () => {
      expect(issue({ orderType: 'MOC' }, 'orderType')).toBe('크립토는 시장가 주문만 지원합니다.')
      expect(dcaRuleSchema.safeParse(c({ frequency: 'WEEKLY', dayOfWeek: 'SUNDAY' })).success).toBe(true)
    })
  })

  describe('주식', () => {
    it('MARKET 거부, 주말 거부, 소수 USD 허용', () => {
      expect(ruleIssue({ orderType: 'MARKET' }, 'orderType')).toBe('주문 방식을 선택하세요.')
      expect(ruleIssue({ frequency: 'WEEKLY', dayOfWeek: 'SATURDAY' }, 'dayOfWeek')).toBe('평일을 선택하세요.')
      expect(ok({ amount: 0.5 })).toBe(true)
    })
  })

  describe('sizing', () => {
    it('BUY + HOLDING_PERCENT는 sizingType 오류', () => {
      expect(ruleIssue({ direction: 'BUY', sizingType: 'HOLDING_PERCENT', percent: 50 }, 'sizingType'))
        .toBe('보유 비율은 매도 규칙에서만 쓸 수 있습니다.')
    })
    const sell = (percent: number | null): Partial<DcaRuleFormValues> =>
      ({ direction: 'SELL', sizingType: 'HOLDING_PERCENT', amount: null, percent })
    it.each([0, 100.5])('percent %s는 범위 오류', (p) => {
      expect(ruleIssue(sell(p), 'percent')).toBe('0 초과 100 이하로 입력하세요.')
    })
    it('percent 33.333은 자릿수 오류', () => {
      expect(ruleIssue(sell(33.333), 'percent')).toBe('소수 둘째 자리까지 입력하세요.')
    })
    it('percent null은 오류', () => expect(ruleIssue(sell(null), 'percent')).toBe('비율을 입력하세요.'))
    it.each([50, 100, 33.33])('percent %s 통과', (p) => expect(ok(sell(p))).toBe(true))
    it('HOLDING_PERCENT면 amount null이어도 통과', () => expect(ok(sell(50))).toBe(true))
  })
})

describe('dcaFormSchema', () => {
  it('기본값 통과', () => expect(formOk({})).toBe(true))
  it('시작예정일은 오늘 이후만 허용', () => {
    expect(formOk({ scheduledStartDate: todayKst() })).toBe(true)
    expect(formOk({ scheduledStartDate: '2000-01-01' })).toBe(false)
  })
  it('규칙 0개는 오류, 최대 개수까지 허용, 초과 거부', () => {
    expect(formIssue({ rules: [] }, 'rules')).toBe('규칙을 추가하세요.')
    expect(formOk({ rules: Array(MAX_DCA_RULES).fill(rule) })).toBe(true)
    expect(formOk({ rules: Array(MAX_DCA_RULES + 1).fill(rule) })).toBe(false)
  })
  it('규칙 오류 경로에 인덱스가 붙는다', () => {
    expect(formIssue({ rules: [rule, { ...rule, amount: null }] }, 'rules.1.amount')).toBe('금액을 입력하세요.')
  })

  describe('보유 시작값', () => {
    it('수량만 입력하면 평단가 오류', () => {
      expect(formIssue({ initialHoldings: 10 }, 'initialAvgPrice')).toBe('보유 수량을 입력하면 평단가는 0보다 커야 합니다.')
    })
    it('평단가만 입력하면 수량 오류', () => {
      expect(formIssue({ initialAvgPrice: 10 }, 'initialHoldings')).toBe('평단가를 입력하면 수량은 0보다 커야 합니다.')
    })
    it('둘 다 입력하면 통과, 둘 다 null도 통과', () => {
      expect(formOk({ initialHoldings: 10, initialAvgPrice: 50 })).toBe(true)
      expect(formOk({})).toBe(true)
    })
    it('주식 수량 소수는 거부', () => {
      expect(formIssue({ initialHoldings: 1.5, initialAvgPrice: 50 }, 'initialHoldings')).toBe('수량은 정수여야 합니다.')
    })
    it('크립토 수량은 소수 8자리까지', () => {
      const c = { market: 'CRYPTO_KRW' as const, rules: [cryptoRule], initialAvgPrice: 50000000 }
      expect(formIssue({ ...c, initialHoldings: 0.123456789 }, 'initialHoldings')).toBe('소수 여덟째 자리까지 입력하세요.')
      expect(formOk({ ...c, initialHoldings: 0.12345678 })).toBe(true)
    })
    it('음수는 거부', () => {
      expect(formIssue({ initialHoldings: -1, initialAvgPrice: 50 }, 'initialHoldings')).toBe('수량은 0 이상이어야 합니다.')
      expect(formIssue({ initialHoldings: 1, initialAvgPrice: -1 }, 'initialAvgPrice')).toBe('평단가는 0 이상이어야 합니다.')
    })
  })
})

describe('buildDcaRuleDefaults', () => {
  it('크립토 SELL 기본값', () => {
    expect(buildDcaRuleDefaults('SELL', 'CRYPTO_KRW', testOrderAmount('CRYPTO_KRW'))).toEqual({
      market: 'CRYPTO_KRW', orderAmount: testOrderAmount('CRYPTO_KRW'), ruleKey: null, direction: 'SELL', orderType: 'MARKET', executionHour: 9,
      frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: 'LAST',
      sizingType: 'AMOUNT', amount: null, percent: null, shortfall: 'PARTIAL', conditions: [],
    })
  })
  it('주식은 MOC·실행 시각 없음', () => {
    expect(buildDcaRuleDefaults('BUY', 'US_STOCK', testOrderAmount('US_STOCK'))).toMatchObject({ orderType: 'MOC', executionHour: null })
  })
})

describe('buildDcaFormDefaults', () => {
  const dcaRule = (o: object) => ({
    ruleKey: 'a', direction: 'SELL', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: 15, orderType: 'MOO', executionHour: null,
    sizing: { type: 'AMOUNT', amount: 250, percent: null }, shortfall: 'PARTIAL', conditions: [],
    nextExecution: null, lastExecution: null, ...o,
  })
  const strategy = (rules: object[]): Strategy => ({
    id: 's1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'QLD', cycleSeedType: 'NONE', isReverseMode: false,
    dca: { rules, currentHoldings: null, avgPrice: null },
  } as unknown as Strategy)

  it('등록 기본값은 규칙 없음', () => {
    expect(buildDcaFormDefaults(undefined, 'UPRO', 'US_STOCK', testOrderAmount('US_STOCK'))).toEqual({
      market: 'US_STOCK', ticker: 'UPRO', scheduledStartDate: todayKst(), initialHoldings: null, initialAvgPrice: null, rules: [],
    })
  })
  it('dca가 없는 initial도 기본값', () => {
    expect(buildDcaFormDefaults({ ...strategy([]), dca: undefined } as Strategy, 'UPRO', 'US_STOCK', testOrderAmount('US_STOCK')).ticker).toBe('UPRO')
  })
  it('수정 기본값은 순서·ruleKey·sizing을 보존한다', () => {
    const v = buildDcaFormDefaults(strategy([
      dcaRule({ ruleKey: 'a' }),
      dcaRule({ ruleKey: 'b', sizing: { type: 'HOLDING_PERCENT', amount: null, percent: 50 }, dayOfMonth: null }),
    ]), 'UPRO', 'US_STOCK', testOrderAmount('US_STOCK'))
    expect(v).toMatchObject({ ticker: 'QLD', scheduledStartDate: null, initialHoldings: null, initialAvgPrice: null })
    expect(v.rules.map((r) => r.ruleKey)).toEqual(['a', 'b'])
    expect(v.rules[0]).toMatchObject({ direction: 'SELL', sizingType: 'AMOUNT', amount: 250, percent: null, dayOfMonth: '15', shortfall: 'PARTIAL' })
    expect(v.rules[1]).toMatchObject({ sizingType: 'HOLDING_PERCENT', amount: null, percent: 50, dayOfMonth: 'LAST' })
  })
  it('MONTHLY가 아니면 dayOfMonth는 null', () => {
    const v = buildDcaFormDefaults(strategy([dcaRule({ frequency: 'WEEKLY', dayOfWeek: 'FRIDAY' })]), 'UPRO', 'US_STOCK', testOrderAmount('US_STOCK'))
    expect(v.rules[0]).toMatchObject({ dayOfMonth: null, dayOfWeek: 'FRIDAY' })
  })
  it('조건의 누락된 threshold·smaPeriod는 null', () => {
    const v = buildDcaFormDefaults(strategy([dcaRule({ conditions: [
      { indicator: 'SMA', operator: 'LT', smaPeriod: 200 }, { indicator: 'RSI', operator: 'LTE', threshold: 35 },
    ] })]), 'UPRO', 'US_STOCK', testOrderAmount('US_STOCK'))
    expect(v.rules[0].conditions).toEqual([
      { indicator: 'SMA', operator: 'LT', threshold: null, smaPeriod: 200 },
      { indicator: 'RSI', operator: 'LTE', threshold: 35, smaPeriod: null },
    ])
  })
  it('크립토 수정은 00시를 유지하고, 시각 없는 응답은 09시로 채운다', () => {
    expect(buildDcaFormDefaults(strategy([dcaRule({ orderType: 'MARKET', executionHour: 0 })]), 'BTC', 'CRYPTO_KRW', testOrderAmount('CRYPTO_KRW')).rules[0].executionHour).toBe(0)
    expect(buildDcaFormDefaults(strategy([dcaRule({ orderType: 'MARKET' })]), 'BTC', 'CRYPTO_KRW', testOrderAmount('CRYPTO_KRW')).rules[0].executionHour).toBe(9)
    expect(buildDcaFormDefaults(strategy([dcaRule({})]), 'BTC', 'US_STOCK', testOrderAmount('US_STOCK')).rules[0].executionHour).toBeNull()
  })
})
