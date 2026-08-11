import { describe, expect, it } from 'vitest'
import {
  emptyMessage,
  fromMonthInput,
  subtractMonths,
  toMonthInput,
  uniqueSymbols,
} from './benchmarkPeriods'

describe('toMonthInput', () => {
  it('날짜 문자열에서 연-월만 잘라낸다', () => {
    expect(toMonthInput('2026-07-17')).toBe('2026-07')
  })
})

describe('fromMonthInput', () => {
  it('연-월 문자열에 1일을 붙인다', () => {
    expect(fromMonthInput('2026-07')).toBe('2026-07-01')
  })
})

describe('subtractMonths', () => {
  it('같은 해 안에서 개월을 뺀다', () => {
    expect(subtractMonths('2026-07-17', 3)).toBe('2026-04-17')
  })

  it('연도 경계를 넘어 개월을 뺀다', () => {
    expect(subtractMonths('2026-07-17', 12)).toBe('2025-07-17')
    expect(subtractMonths('2026-01-15', 1)).toBe('2025-12-15')
  })

  it('윤년 2월 29일에서 연도를 빼면 다음 해 2월 말일로 클램프한다', () => {
    expect(subtractMonths('2024-02-29', 12)).toBe('2023-02-28')
  })

  it('일수가 더 적은 달로 이동하면 해당 달의 말일로 클램프한다', () => {
    // 2026년은 평년 — 2월은 28일까지
    expect(subtractMonths('2026-03-31', 1)).toBe('2026-02-28')
  })

  it('윤년 2월로 이동하면 29일까지 허용한다', () => {
    expect(subtractMonths('2024-03-31', 1)).toBe('2024-02-29')
  })
})

describe('emptyMessage', () => {
  it('INSUFFICIENT_OVERLAP은 자산 단위에 따라 다른 문구를 반환한다', () => {
    expect(emptyMessage('INSUFFICIENT_OVERLAP', true)).toContain('거래일')
    expect(emptyMessage('INSUFFICIENT_OVERLAP', false)).toContain('주치')
  })

  it('INSUFFICIENT_COMMON_MONTHS도 동일하게 처리한다', () => {
    expect(emptyMessage('INSUFFICIENT_COMMON_MONTHS', true)).toContain('거래일')
    expect(emptyMessage('INSUFFICIENT_COMMON_MONTHS', false)).toContain('주치')
  })

  it('NO_INVESTMENT_DATA는 운용 기록 없음 문구를 반환한다', () => {
    expect(emptyMessage('NO_INVESTMENT_DATA', true)).toBe('선택한 기간에 전략 운용 기록이 없습니다.')
  })

  it('그 외 사유·null·undefined는 기본 문구를 반환한다', () => {
    expect(emptyMessage(null, true)).toBe('비교할 수 있는 데이터가 충분하지 않습니다.')
    expect(emptyMessage(undefined, true)).toBe('비교할 수 있는 데이터가 충분하지 않습니다.')
    expect(emptyMessage('UNKNOWN_REASON', true)).toBe('비교할 수 있는 데이터가 충분하지 않습니다.')
  })
})

describe('uniqueSymbols', () => {
  it('공백 제거·대문자 정규화 후 중복을 제거한다', () => {
    expect(uniqueSymbols([' spy ', 'SPY', 'qqq', ''])).toEqual(['SPY', 'QQQ'])
  })
})
