import { describe, expect, it } from 'vitest'
import { previousYearRange } from './period'

describe('previousYearRange', () => {
  it('연간 모드 선택월의 전년 1월~동일월 말일 범위를 반환한다', () => {
    expect(previousYearRange({ month: '2026-08', mode: 'yearly' })).toEqual({
      from: '2025-01-01',
      to: '2025-08-31',
    })
  })
})
