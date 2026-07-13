import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  kstDateMinusDays,
  parsePage,
  parseRangePreset,
  parseSize,
  resolveRange,
  resolveRangeStrict,
} from './date-range'

afterEach(() => {
  vi.useRealTimers()
})

// UTC 2026-07-08 20:00 = KST 2026-07-09 05:00 — UTC 날짜와 KST 날짜가 갈리는 시각
function freezeAtKstMorning() {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-08T20:00:00Z'))
}

describe('kstDateMinusDays', () => {
  it('KST 오늘 기준으로 N일 전 날짜를 반환한다 (UTC 날짜가 아님)', () => {
    freezeAtKstMorning()
    expect(kstDateMinusDays(0)).toBe('2026-07-09')
    expect(kstDateMinusDays(7)).toBe('2026-07-02')
  })
})

describe('resolveRange', () => {
  it('7d는 KST 오늘 기준 7일 전부터 상한 없음', () => {
    freezeAtKstMorning()
    expect(resolveRange('7d')).toEqual({ from: '2026-07-02' })
  })
  it('30d는 KST 오늘 기준 30일 전부터 상한 없음', () => {
    freezeAtKstMorning()
    expect(resolveRange('30d')).toEqual({ from: '2026-06-09' })
  })
  it('all은 빈 객체(전체 기간)', () => {
    expect(resolveRange('all')).toEqual({})
  })
  it('custom은 입력을 그대로 통과시킨다 (미완성이어도)', () => {
    expect(resolveRange('custom', '2026-01-01', '2026-01-31')).toEqual({ from: '2026-01-01', to: '2026-01-31' })
    expect(resolveRange('custom')).toEqual({ from: undefined, to: undefined })
  })
})

describe('resolveRangeStrict', () => {
  it('custom인데 from/to가 미완성이면 null (조회 보류)', () => {
    expect(resolveRangeStrict('custom', '', '')).toBeNull()
    expect(resolveRangeStrict('custom', '2026-01-01', '')).toBeNull()
  })
  it('완성된 custom과 프리셋은 resolveRange와 동일', () => {
    expect(resolveRangeStrict('custom', '2026-01-01', '2026-01-31')).toEqual({ from: '2026-01-01', to: '2026-01-31' })
    expect(resolveRangeStrict('all', '', '')).toEqual({})
  })
})

describe('parseRangePreset', () => {
  it('유효한 값은 그대로, 그 외는 fallback', () => {
    expect(parseRangePreset('30d', '7d')).toBe('30d')
    expect(parseRangePreset('bogus', '7d')).toBe('7d')
    expect(parseRangePreset(undefined, 'all')).toBe('all')
  })
})

describe('parseSize', () => {
  it('허용 목록(10/30/50/100)만 통과, 그 외 10', () => {
    expect(parseSize('50')).toBe(50)
    expect(parseSize('999')).toBe(10)
    expect(parseSize(undefined)).toBe(10)
  })
})

describe('parsePage', () => {
  it('1 이상 정수만 통과, 그 외 1', () => {
    expect(parsePage('3')).toBe(3)
    expect(parsePage('0')).toBe(1)
    expect(parsePage('abc')).toBe(1)
    expect(parsePage(undefined)).toBe(1)
  })
})
