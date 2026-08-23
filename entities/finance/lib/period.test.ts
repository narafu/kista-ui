import { describe, expect, it } from 'vitest'
import { elapsedMonthsInYear, periodRange, previousYearRange, yearsRange } from './period'

describe('periodRange 연간 모드', () => {
  it('선택 연도가 올해면 1월 1일~오늘까지(YTD)를 반환한다', () => {
    expect(periodRange({ month: '2026-03', mode: 'yearly' }, '2026-08-23')).toEqual({
      from: '2026-01-01',
      to: '2026-08-23',
    })
  })

  it('선택 연도가 과거면 mm과 무관하게 1월~12월 전체를 반환한다', () => {
    expect(periodRange({ month: '2025-03', mode: 'yearly' }, '2026-08-23')).toEqual({
      from: '2025-01-01',
      to: '2025-12-31',
    })
  })
})

describe('elapsedMonthsInYear', () => {
  it('올해면 오늘 기준 월 수를 반환한다', () => {
    expect(elapsedMonthsInYear('2026-03', '2026-08-23')).toBe(8)
  })

  it('과거 연도면 12를 반환한다', () => {
    expect(elapsedMonthsInYear('2025-03', '2026-08-23')).toBe(12)
  })
})

describe('previousYearRange', () => {
  it('선택 연도가 올해면 전년 1월~오늘과 동일한 일자까지를 반환한다 (periodRange와 대칭)', () => {
    expect(previousYearRange({ month: '2026-08', mode: 'yearly' }, '2026-08-23')).toEqual({
      from: '2025-01-01',
      to: '2025-08-23',
    })
  })

  it('전년에 없는 날짜(윤년 2/29 등)는 그 달 말일로 clamp한다', () => {
    expect(previousYearRange({ month: '2024-02', mode: 'yearly' }, '2024-02-29')).toEqual({
      from: '2023-01-01',
      to: '2023-02-28',
    })
  })

  it('선택 연도가 과거면 전년 1월~12월 전체를 반환한다', () => {
    expect(previousYearRange({ month: '2025-03', mode: 'yearly' }, '2026-08-23')).toEqual({
      from: '2024-01-01',
      to: '2024-12-31',
    })
  })
})

describe('yearsRange', () => {
  it('선택 연도가 올해면 과거 (yearsLimit-1)개년 1월 1일부터 오늘까지 반환한다', () => {
    expect(yearsRange('2026-03', 6, '2026-08-23')).toEqual({
      from: '2021-01-01',
      to: '2026-08-23',
    })
  })

  it('선택 연도가 과거면 mm과 무관하게 그 해 12월 31일까지 반환한다', () => {
    expect(yearsRange('2023-03', 6, '2026-08-23')).toEqual({
      from: '2018-01-01',
      to: '2023-12-31',
    })
  })
})
