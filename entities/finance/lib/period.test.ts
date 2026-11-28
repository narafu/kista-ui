import { describe, expect, it } from 'vitest'
import { autoAdjustedMonth, displayWindow, periodRange } from './period'

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

describe('autoAdjustedMonth', () => {
  const dates = ['2026-07-03', '2026-08-11', '2026-08-25']

  it('선택월에 거래가 있으면 조정하지 않는다(null)', () => {
    expect(autoAdjustedMonth('2026-08', dates)).toBeNull()
  })

  it('선택월에 거래가 없으면 목록 중 가장 최근 월을 반환한다', () => {
    expect(autoAdjustedMonth('2026-09', dates)).toBe('2026-08')
  })

  it('거래 목록이 비어 있으면 조정하지 않는다(null)', () => {
    expect(autoAdjustedMonth('2026-09', [])).toBeNull()
  })

  it('가장 최근 월이 곧 선택월이면 조정하지 않는다(null)', () => {
    expect(autoAdjustedMonth('2026-08', ['2026-08-01'])).toBeNull()
  })

  it('선택월보다 미래에만 거래가 있으면 그 미래 월로 이동한다', () => {
    expect(autoAdjustedMonth('2026-06', dates)).toBe('2026-08')
  })
})

describe('displayWindow', () => {
  it('월간: 선택월 포함 12개월(자동 월 보정용), 연간: periodRange와 같은 범위', () => {
    expect(displayWindow({ month: '2026-08', mode: 'monthly' }, '2026-08-23')).toEqual({ from: '2025-09-01', to: '2026-08-31' })
    expect(displayWindow({ month: '2025-03', mode: 'yearly' }, '2026-08-23')).toEqual({ from: '2025-01-01', to: '2025-12-31' })
  })
})
