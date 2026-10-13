import { describe, expect, it } from 'vitest'
import type { Strategy } from '@entities/strategy'
import { buildDcaFormDefaults, dcaFormSchema, type DcaFormValues } from './dcaFormSchema'

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
  it('AVG_PRICE는 -100 초과', () => {
    expect(ok({ conditions: [{ indicator: 'AVG_PRICE', operator: 'LTE', threshold: -100, smaPeriod: null }] })).toBe(false)
    expect(ok({ conditions: [{ indicator: 'AVG_PRICE', operator: 'LTE', threshold: -99.99, smaPeriod: null }] })).toBe(true)
  })
  it('기준값은 소수 둘째 자리까지', () => {
    expect(ok({ conditions: [{ indicator: 'RSI', operator: 'LTE', threshold: 35.123, smaPeriod: null }] })).toBe(false)
    expect(ok({ conditions: [{ indicator: 'RSI', operator: 'LTE', threshold: 35.12, smaPeriod: null }] })).toBe(true)
  })
  it('조건은 최대 10개', () => {
    const c = { indicator: 'RSI' as const, operator: 'LTE' as const, threshold: 35, smaPeriod: null }
    expect(ok({ conditions: Array(10).fill(c) })).toBe(true)
    expect(ok({ conditions: Array(11).fill(c) })).toBe(false)
  })
})

describe('dcaFormSchema MONTHLY dayOfMonth 검증', () => {
  const monthly = (dayOfMonth: string | null) => dcaFormSchema.safeParse({ ...base, frequency: 'MONTHLY', dayOfMonth })

  it.each(['0', '32', 'abc', '1.5'])('"%s"는 거부하고 안내 메시지를 낸다', (v) => {
    const r = monthly(v)
    expect(r.success).toBe(false)
    expect(!r.success && r.error.issues[0].message).toBe('1~31일 또는 말일을 선택하세요.')
  })

  it.each(['1', '31', 'LAST'])('"%s"는 통과한다', (v) => {
    expect(monthly(v).success).toBe(true)
  })

  it('빈 값이면 날짜 선택 메시지를 낸다', () => {
    for (const v of ['', null]) {
      const r = monthly(v)
      expect(r.success).toBe(false)
      expect(!r.success && r.error.issues[0].message).toBe('날짜를 선택하세요.')
    }
  })
})

describe('buildDcaFormDefaults', () => {
  const strategy = (dca: Partial<NonNullable<Strategy['dca']>>): Strategy => ({
    id: 's1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'QLD', cycleSeedType: 'MAX',
    initialUsdDeposit: 0, divisionCount: 0, isReverseMode: false,
    dca: {
      direction: 'SELL', amountUsd: 250, orderType: 'MOO', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: 15, conditions: [],
      ...dca,
    },
  } as unknown as Strategy)

  it('initial이 없으면 기본값(월간·말일·MOC)을 돌려준다', () => {
    expect(buildDcaFormDefaults(undefined, 'UPRO')).toEqual({
      ticker: 'UPRO', direction: 'BUY', amountUsd: null, orderType: 'MOC', frequency: 'MONTHLY',
      dayOfWeek: null, dayOfMonth: 'LAST', scheduledStartDate: null, conditions: [],
    })
  })

  it('initial에 dca 설정이 없어도 기본값을 돌려준다', () => {
    const noDca = { ...strategy({}), dca: undefined } as Strategy
    expect(buildDcaFormDefaults(noDca, 'UPRO').ticker).toBe('UPRO')
  })

  it('수정 모드는 initial.dca를 폼 값으로 역변환한다 (dayOfMonth 숫자 -> 문자열)', () => {
    const v = buildDcaFormDefaults(strategy({}), 'UPRO')
    expect(v).toMatchObject({
      ticker: 'QLD', direction: 'SELL', amountUsd: 250, orderType: 'MOO', frequency: 'MONTHLY',
      dayOfWeek: null, dayOfMonth: '15', scheduledStartDate: null,
    })
  })

  it('MONTHLY에서 dayOfMonth null(말일)은 LAST로 변환한다', () => {
    expect(buildDcaFormDefaults(strategy({ dayOfMonth: null }), 'UPRO').dayOfMonth).toBe('LAST')
  })

  it('MONTHLY가 아니면 dayOfMonth는 null이다', () => {
    const v = buildDcaFormDefaults(strategy({ frequency: 'WEEKLY', dayOfWeek: 'FRIDAY', dayOfMonth: 15 }), 'UPRO')
    expect(v.dayOfMonth).toBeNull()
    expect(v.dayOfWeek).toBe('FRIDAY')
  })

  it('조건의 threshold·smaPeriod가 누락되면 null로 채운다', () => {
    const v = buildDcaFormDefaults(strategy({
      conditions: [
        { indicator: 'SMA', operator: 'LT', smaPeriod: 200 },
        { indicator: 'RSI', operator: 'LTE', threshold: 35 },
      ],
    } as never), 'UPRO')
    expect(v.conditions).toEqual([
      { indicator: 'SMA', operator: 'LT', threshold: null, smaPeriod: 200 },
      { indicator: 'RSI', operator: 'LTE', threshold: 35, smaPeriod: null },
    ])
  })
})
