import { describe, expect, it } from 'vitest'
import { dcaIndicatorLabel, earliestNextExecution, formatDcaCondition, formatDcaRuleWhen, formatDcaSchedule, formatDcaSizing, latestLastExecution } from './dcaFormat'
import type { DcaLabelOf } from './dcaFormat'
import type { DcaRule } from './types'

const labelOf: DcaLabelOf = (_c, code) => ({ BUY: '매수', SELL: '매도', DAILY: '매일', MONTHLY: '매월', MOC: 'MOC(종가시장가)' } as Record<string, string>)[code] ?? code
const BASE_RULE: DcaRule = {
  ruleKey: 'k', direction: 'BUY', frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, orderType: 'MOC',
  sizing: { type: 'AMOUNT', amount: 100, percent: null }, shortfall: 'PARTIAL', conditions: [], nextExecution: null, lastExecution: null,
}

describe('DCA 규칙 요약', () => {
  it('주식 규칙은 주문 방식을 시점으로 표시', () => {
    expect(formatDcaRuleWhen({ direction: 'BUY', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null, orderType: 'MOC', sizing: { type: 'AMOUNT', amount: 100, percent: null } }, labelOf))
      .toBe('매월 말일 · MOC(종가시장가)')
    expect(formatDcaSizing({ type: 'AMOUNT', amount: 100, percent: null })).toBe('$100.00')
  })
  it('보유 비율 매도', () => {
    expect(formatDcaSizing({ type: 'HOLDING_PERCENT', amount: null, percent: 50 })).toBe('보유 50%')
  })
  it('가장 이른 다음 실행 — 날짜 같으면 앞 규칙, null은 뒤로', () => {
    const r = (key: string, date: string | null): DcaRule => ({ ...BASE_RULE, ruleKey: key, nextExecution: date ? { usSessionDate: date, kstTradeDate: date } : null })
    expect(earliestNextExecution([r('a', null), r('b', '2026-10-24'), r('c', '2026-10-23'), r('d', '2026-10-23')])?.ruleKey).toBe('c')
    expect(earliestNextExecution([r('a', null)])).toBeNull()
  })
  it('가장 최근 실행 결과', () => {
    const r = (d: string | null): DcaRule => ({ ...BASE_RULE, lastExecution: d ? { kstTradeDate: d, status: 'ORDERED', skipReason: null } : null })
    expect(latestLastExecution([r('2026-10-20'), r(null), r('2026-10-21')])?.kstTradeDate).toBe('2026-10-21')
    expect(latestLastExecution([r(null)])).toBeNull()
  })
})

describe('formatDcaSchedule', () => {
  it('DAILY는 빈도 라벨만', () => {
    expect(formatDcaSchedule({ frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null }, '매일')).toBe('매일')
  })
  it('WEEKLY는 요일 한글명', () => {
    expect(formatDcaSchedule({ frequency: 'WEEKLY', dayOfWeek: 'MONDAY', dayOfMonth: null }, '매주')).toBe('매주 월요일')
  })
  it('MONTHLY + 숫자는 n일', () => {
    expect(formatDcaSchedule({ frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: 31 }, '매월')).toBe('매월 31일')
  })
  it('MONTHLY + null은 말일', () => {
    expect(formatDcaSchedule({ frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null }, '매월')).toBe('매월 말일')
  })
})

describe('formatDcaCondition', () => {
  it('평단가는 부호 있는 %', () => {
    expect(formatDcaCondition({ indicator: 'AVG_PRICE', operator: 'LTE', threshold: -5 }, '평단가', '이하')).toBe('평단가 -5% 이하')
    expect(formatDcaCondition({ indicator: 'AVG_PRICE', operator: 'GTE', threshold: 20 }, '평단가', '이상')).toBe('평단가 +20% 이상')
  })
  it('SMA는 기간만, threshold 없음', () => {
    expect(formatDcaCondition({ indicator: 'SMA', operator: 'LT', smaPeriod: 200 }, '이동평균선', '미만')).toBe('이동평균선(200) 미만')
  })
  it('RSI·공포탐욕은 숫자', () => {
    expect(formatDcaCondition({ indicator: 'RSI', operator: 'LTE', threshold: 35 }, 'RSI(14)', '이하')).toBe('RSI(14) 35 이하')
    expect(formatDcaCondition({ indicator: 'FEAR_GREED', operator: 'LT', threshold: 25 }, '공포탐욕지수(CNN)', '미만')).toBe('공포탐욕지수(CNN) 25 미만')
  })
  it('기간·기준값 누락 시 undefined 대신 -', () => {
    expect(formatDcaCondition({ indicator: 'SMA', operator: 'LT' }, '이동평균선', '미만')).toBe('이동평균선(-) 미만')
    expect(formatDcaCondition({ indicator: 'AVG_PRICE', operator: 'LTE' }, '평단가', '이하')).toBe('평단가 - 이하')
    expect(formatDcaCondition({ indicator: 'RSI', operator: 'LTE', }, 'RSI(14)', '이하')).toBe('RSI(14) - 이하')
  })
})

describe('dcaIndicatorLabel', () => {
  it('FEAR_GREED만 (CNN)을 붙인다', () => {
    expect(dcaIndicatorLabel('FEAR_GREED', '공포탐욕지수')).toBe('공포탐욕지수(CNN)')
    expect(dcaIndicatorLabel('RSI', 'RSI(14)')).toBe('RSI(14)')
  })
})
