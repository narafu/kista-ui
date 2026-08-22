import { describe, expect, it } from 'vitest'
import { previousYearRange, yearsRange } from './period'

describe('previousYearRange', () => {
  it('연간 모드 선택월의 전년 1월~동일월 말일 범위를 반환한다', () => {
    expect(previousYearRange({ month: '2026-08', mode: 'yearly' })).toEqual({
      from: '2025-01-01',
      to: '2025-08-31',
    })
  })
})

describe('yearsRange', () => {
  it('선택월 기준 과거 (yearsLimit-1)개년 1월 1일부터 선택월 말일까지 반환한다', () => {
    expect(yearsRange('2026-08', 6)).toEqual({
      from: '2021-01-01',
      to: '2026-08-31',
    })
  })
})
