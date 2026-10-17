import { describe, expect, it } from 'vitest'
import { formatDcaCondition, formatDcaSchedule } from './dcaFormat'

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
