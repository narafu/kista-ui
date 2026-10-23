import { describe, expect, it } from 'vitest'
import { dcaIndicatorLabel, earliestNextExecution, formatCryptoNextExecution, formatDcaCondition, formatDcaRuleSummary, formatDcaSchedule, formatDcaSizing, latestLastExecution } from './dcaFormat'
import type { DcaLabelOf } from './dcaFormat'
import type { DcaRule } from './types'

const labelOf: DcaLabelOf = (_c, code) => ({ BUY: '매수', SELL: '매도', DAILY: '매일', MONTHLY: '매월', MOC: 'MOC' } as Record<string, string>)[code] ?? code
const BASE_RULE: DcaRule = {
  ruleKey: 'k', direction: 'BUY', frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, orderType: 'MOC', executionHour: null,
  sizing: { type: 'AMOUNT', amount: 100, percent: null }, shortfall: 'PARTIAL', conditions: [], nextExecution: null, lastExecution: null,
}

describe('DCA 규칙 요약', () => {
  it('크립토 매수 금액 규칙 요약', () => {
    expect(formatDcaRuleSummary({ direction: 'BUY', frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, orderType: 'MARKET', executionHour: 9, sizing: { type: 'AMOUNT', amount: 15000, percent: null } }, labelOf, 'CRYPTO_KRW'))
      .toBe('매수 · 매일 09시 · 15,000원')
  })
  it('바이낸스 규칙 금액은 USDT로 표시', () => {
    expect(formatDcaRuleSummary({ direction: 'BUY', frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, orderType: 'MARKET', executionHour: 9, sizing: { type: 'AMOUNT', amount: 10.5, percent: null } }, labelOf, 'CRYPTO_USDT'))
      .toBe('매수 · 매일 09시 · 10.50 USDT')
  })
  it('주식 규칙은 주문 방식을 시점으로 표시', () => {
    expect(formatDcaRuleSummary({ direction: 'BUY', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null, orderType: 'MOC', sizing: { type: 'AMOUNT', amount: 100, percent: null } }, labelOf, 'US_STOCK'))
      .toBe('매수 · 매월 말일 · MOC · $100.00')
  })
  it('보유 비율 매도', () => {
    expect(formatDcaSizing({ type: 'HOLDING_PERCENT', amount: null, percent: 50 }, 'CRYPTO_KRW')).toBe('보유 50%')
  })
  it('가장 이른 다음 실행 — 날짜 같으면 실행 시각 비교, null은 뒤로', () => {
    const r = (key: string, date: string | null, hour: number | null): DcaRule => ({ ...BASE_RULE, ruleKey: key, executionHour: hour, nextExecution: date ? { usSessionDate: date, kstTradeDate: date } : null })
    expect(earliestNextExecution([r('a', null, 9), r('b', '2026-10-23', 10), r('c', '2026-10-23', 9)])?.ruleKey).toBe('c')
    expect(earliestNextExecution([r('a', null, 9)])).toBeNull()
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

describe('formatDcaSchedule — 실행 시각', () => {
  it('실행 시각이 있으면 스케줄 뒤에 시를 붙인다', () => {
    expect(formatDcaSchedule({ frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, executionHour: 9 }, '매일')).toBe('매일 09시')
    expect(formatDcaSchedule({ frequency: 'WEEKLY', dayOfWeek: 'SUNDAY', dayOfMonth: null, executionHour: 0 }, '매주')).toBe('매주 일요일 00시')
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

describe('formatCryptoNextExecution', () => {
  it('KST 날짜를 M/D로, 실행 시각을 HH시로 붙인다', () => {
    expect(formatCryptoNextExecution('2026-10-19', 9)).toBe('10/19 09시')
  })
  it('날짜가 없으면 미정', () => {
    expect(formatCryptoNextExecution(undefined, 9)).toBe('미정')
  })
})

describe('dcaIndicatorLabel', () => {
  it('FEAR_GREED만 주식은 (CNN), 코인은 (Crypto)를 붙인다', () => {
    expect(dcaIndicatorLabel('FEAR_GREED', '공포탐욕지수', false)).toBe('공포탐욕지수(CNN)')
    expect(dcaIndicatorLabel('FEAR_GREED', '공포탐욕지수', true)).toBe('공포탐욕지수(Crypto)')
    expect(dcaIndicatorLabel('RSI', 'RSI(14)', true)).toBe('RSI(14)')
  })
})
