import { describe, expect, it } from 'vitest'
import type { Strategy } from '@entities/strategy'
import { todayKst } from '@shared/lib/format'
import { buildDcaFormDefaults, dcaFormSchema, type DcaFormValues } from './dcaFormSchema'

const base: DcaFormValues = {
  market: 'US_STOCK', ticker: 'UPRO', direction: 'BUY', amount: 300, orderType: 'MOC', frequency: 'DAILY', executionHour: null,
  dayOfWeek: null, dayOfMonth: null, scheduledStartDate: null, conditions: [],
}

const ok = (v: Partial<DcaFormValues>) => dcaFormSchema.safeParse({ ...base, ...v }).success

describe('dcaFormSchema', () => {
  it('기본값 통과', () => expect(ok({})).toBe(true))
  it('시작예정일은 오늘 이후만 허용', () => {
    expect(ok({ scheduledStartDate: todayKst() })).toBe(true)
    expect(ok({ scheduledStartDate: '2000-01-01' })).toBe(false)
  })
  it('금액 0·null 거부', () => {
    expect(ok({ amount: 0 })).toBe(false)
    expect(ok({ amount: null })).toBe(false)
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
      direction: 'SELL', amount: 250, orderType: 'MOO', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: 15, conditions: [],
      ...dca,
    },
  } as unknown as Strategy)

  it('initial이 없으면 기본값(월간·말일·MOC)을 돌려준다', () => {
    expect(buildDcaFormDefaults(undefined, 'UPRO', 'US_STOCK')).toEqual({
      market: 'US_STOCK', ticker: 'UPRO', direction: 'BUY', amount: null, orderType: 'MOC', frequency: 'MONTHLY', executionHour: null,
      dayOfWeek: null, dayOfMonth: 'LAST', scheduledStartDate: todayKst(), conditions: [],
    })
  })

  it('initial에 dca 설정이 없어도 기본값을 돌려준다', () => {
    const noDca = { ...strategy({}), dca: undefined } as Strategy
    expect(buildDcaFormDefaults(noDca, 'UPRO', 'US_STOCK').ticker).toBe('UPRO')
  })

  it('수정 모드는 initial.dca를 폼 값으로 역변환한다 (dayOfMonth 숫자 -> 문자열)', () => {
    const v = buildDcaFormDefaults(strategy({}), 'UPRO', 'US_STOCK')
    expect(v).toMatchObject({
      ticker: 'QLD', direction: 'SELL', amount: 250, orderType: 'MOO', frequency: 'MONTHLY',
      dayOfWeek: null, dayOfMonth: '15', scheduledStartDate: null,
    })
  })

  it('MONTHLY에서 dayOfMonth null(말일)은 LAST로 변환한다', () => {
    expect(buildDcaFormDefaults(strategy({ dayOfMonth: null }), 'UPRO', 'US_STOCK').dayOfMonth).toBe('LAST')
  })

  it('MONTHLY가 아니면 dayOfMonth는 null이다', () => {
    const v = buildDcaFormDefaults(strategy({ frequency: 'WEEKLY', dayOfWeek: 'FRIDAY', dayOfMonth: 15 }), 'UPRO', 'US_STOCK')
    expect(v.dayOfMonth).toBeNull()
    expect(v.dayOfWeek).toBe('FRIDAY')
  })

  it('조건의 threshold·smaPeriod가 누락되면 null로 채운다', () => {
    const v = buildDcaFormDefaults(strategy({
      conditions: [
        { indicator: 'SMA', operator: 'LT', smaPeriod: 200 },
        { indicator: 'RSI', operator: 'LTE', threshold: 35 },
      ],
    } as never), 'UPRO', 'US_STOCK')
    expect(v.conditions).toEqual([
      { indicator: 'SMA', operator: 'LT', threshold: null, smaPeriod: 200 },
      { indicator: 'RSI', operator: 'LTE', threshold: 35, smaPeriod: null },
    ])
  })
})

const issueAt = (r: ReturnType<typeof dcaFormSchema.safeParse>, path: string) =>
  r.success ? undefined : r.error.issues.find((i) => i.path.join('.') === path)?.message
const crypto: DcaFormValues = { ...base, ticker: 'BTC', market: 'CRYPTO_KRW', orderType: 'MARKET', amount: 5000, executionHour: 9 }

describe('dcaFormSchema — 코인', () => {
  it('최소 주문 금액 5,000원은 통과한다', () => {
    expect(dcaFormSchema.safeParse(crypto).success).toBe(true)
  })

  it('5,000원 미만과 소수 금액은 거부한다', () => {
    expect(issueAt(dcaFormSchema.safeParse({ ...crypto, amount: 4999 }), 'amount')).toBe('최소 주문 금액은 5,000원입니다.')
    expect(issueAt(dcaFormSchema.safeParse({ ...crypto, amount: 5000.5 }), 'amount')).toBe('원 단위 정수로 입력하세요.')
  })

  it('실행 시각 00시는 유효하고, 비어 있으면 거부한다', () => {
    expect(dcaFormSchema.safeParse({ ...crypto, executionHour: 0 }).success).toBe(true)
    expect(issueAt(dcaFormSchema.safeParse({ ...crypto, executionHour: null }), 'executionHour')).toBe('실행 시각을 선택하세요.')
  })

  it('코인은 시장가 주문만 허용한다', () => {
    expect(issueAt(dcaFormSchema.safeParse({ ...crypto, orderType: 'MOC' }), 'orderType')).toBe('코인은 시장가 주문만 지원합니다.')
  })

  it('코인은 주말 요일을 고를 수 있다', () => {
    expect(dcaFormSchema.safeParse({ ...crypto, frequency: 'WEEKLY', dayOfWeek: 'SUNDAY' }).success).toBe(true)
  })
})

describe('dcaFormSchema — 주식', () => {
  it('주식은 MARKET 주문을 거부한다', () => {
    expect(issueAt(dcaFormSchema.safeParse({ ...base, orderType: 'MARKET' }), 'orderType')).toBe('주문 방식을 선택하세요.')
  })

  it('주식은 주말 요일을 거부한다', () => {
    expect(issueAt(dcaFormSchema.safeParse({ ...base, frequency: 'WEEKLY', dayOfWeek: 'SATURDAY' }), 'dayOfWeek')).toBe('평일을 선택하세요.')
    expect(issueAt(dcaFormSchema.safeParse({ ...base, frequency: 'WEEKLY', dayOfWeek: 'SUNDAY' }), 'dayOfWeek')).toBe('평일을 선택하세요.')
  })

  it('주식 금액은 소수 둘째 자리 USD를 허용하고 최소 금액 규칙을 걸지 않는다', () => {
    expect(dcaFormSchema.safeParse({ ...base, amount: 0.5 }).success).toBe(true)
  })
})

describe('buildDcaFormDefaults — 시장별', () => {
  const cryptoStrategy = {
    id: 's1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'BTC', cycleSeedType: 'NONE', isReverseMode: false,
    dca: { direction: 'BUY', amount: 10000, orderType: 'MARKET', frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, executionHour: 0, conditions: [] },
  } as unknown as Strategy

  it('코인 등록 기본값은 시장가·09시다', () => {
    expect(buildDcaFormDefaults(undefined, 'BTC', 'CRYPTO_KRW')).toMatchObject({ market: 'CRYPTO_KRW', orderType: 'MARKET', executionHour: 9, amount: null })
  })

  it('주식 등록 기본값은 MOC이고 실행 시각이 없다', () => {
    expect(buildDcaFormDefaults(undefined, 'UPRO', 'US_STOCK')).toMatchObject({ orderType: 'MOC', executionHour: null })
  })

  it('수정 기본값은 응답의 금액·실행 시각을 채운다(00시 유지)', () => {
    expect(buildDcaFormDefaults(cryptoStrategy, 'BTC', 'CRYPTO_KRW')).toMatchObject({ amount: 10000, executionHour: 0 })
  })

  it('실행 시각이 없는 구 코인 전략은 09시로 채우고, 구 주식 전략은 null이다', () => {
    const noHour = { ...cryptoStrategy, dca: { ...cryptoStrategy.dca, executionHour: null } } as Strategy
    expect(buildDcaFormDefaults(noHour, 'BTC', 'CRYPTO_KRW').executionHour).toBe(9)
    expect(buildDcaFormDefaults(noHour, 'BTC', 'US_STOCK').executionHour).toBeNull()
  })
})
