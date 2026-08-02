import { afterEach, describe, expect, it, vi } from 'vitest'
import { fmtKrwEok, fmtSignedUsd, fmtUsd, pnlTextClass, todayKst, fmtSignedPercent, fmtSignedPercentPoint } from './index'

afterEach(() => {
  vi.useRealTimers()
})

describe('fmtUsd', () => {
  it('천단위 구분자를 포함한다', () => {
    expect(fmtUsd(1234567.891)).toBe('1,234,567.89')
  })

  it('기본 소수 자릿수는 2자리다', () => {
    expect(fmtUsd(1)).toBe('1.00')
  })

  it('digits 파라미터로 소수 자릿수를 지정할 수 있다', () => {
    expect(fmtUsd(1234.5, 0)).toBe('1,235')
    expect(fmtUsd(1.23456, 4)).toBe('1.2346')
  })
})

describe('fmtSignedUsd', () => {
  it('양수는 + 접두사를 붙인다', () => {
    expect(fmtSignedUsd(1234.5)).toBe('+1,234.50')
  })

  it('0은 +0.00을 반환한다', () => {
    expect(fmtSignedUsd(0)).toBe('+0.00')
  })

  it('음수는 - 부호를 그대로 유지한다', () => {
    expect(fmtSignedUsd(-1234.5)).toBe('-1,234.50')
  })

  it('symbol을 주면 부호와 숫자 사이에 삽입한다', () => {
    expect(fmtSignedUsd(150.5, 2, '$')).toBe('+$150.50')
    expect(fmtSignedUsd(-20, 2, '$')).toBe('-$20.00')
  })
})

describe('todayKst', () => {
  it('UTC 자정 이후 KST로는 다음날이 되는 경계를 반영한다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-16T16:00:00Z'))
    expect(todayKst()).toBe('2026-07-17')
  })

  it('UTC 기준 같은 날이지만 KST 자정 전이면 이전 날짜를 반환한다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-16T14:00:00Z'))
    expect(todayKst()).toBe('2026-07-16')
  })
})

describe('fmtKrwEok', () => {
  it('만원 단위 값을 억원 단위로 반올림한다', () => {
    expect(fmtKrwEok(344468.13)).toBe('34.4억')
  })

  it('digits 파라미터로 소수 자릿수를 지정할 수 있다', () => {
    expect(fmtKrwEok(344468.13, 0)).toBe('34억')
    expect(fmtKrwEok(344468.13, 2)).toBe('34.45억')
  })

  it('0은 0억을 반환한다', () => {
    expect(fmtKrwEok(0)).toBe('0.0억')
  })
})

describe('pnlTextClass', () => {
  it('양수는 text-pos를 반환한다', () => {
    expect(pnlTextClass(10)).toBe('text-pos')
  })

  it('0은 text-pos를 반환한다', () => {
    expect(pnlTextClass(0)).toBe('text-pos')
  })

  it('음수는 text-neg를 반환한다', () => {
    expect(pnlTextClass(-10)).toBe('text-neg')
  })
})

describe('fmtSignedPercent', () => {
  it('0~1 비율을 부호 포함 %로 변환한다', () => {
    expect(fmtSignedPercent(0.123)).toBe('+12.3%')
  })

  it('양수는 + 접두사를 붙인다', () => {
    expect(fmtSignedPercent(0.456)).toBe('+45.6%')
  })

  it('음수는 - 부호를 유지한다', () => {
    expect(fmtSignedPercent(-0.123)).toBe('-12.3%')
  })

  it('0은 +0.0%를 반환한다', () => {
    expect(fmtSignedPercent(0)).toBe('+0.0%')
  })

  it('null/undefined는 —를 반환한다', () => {
    expect(fmtSignedPercent(null)).toBe('—')
    expect(fmtSignedPercent(undefined)).toBe('—')
  })

  it('digits 파라미터로 소수 자릿수를 지정할 수 있다', () => {
    expect(fmtSignedPercent(0.12345, 2)).toBe('+12.35%')
    expect(fmtSignedPercent(0.12345, 0)).toBe('+12%')
  })

  it('기본 소수 자릿수는 1자리다', () => {
    expect(fmtSignedPercent(0.1234)).toBe('+12.3%')
  })
})

describe('fmtSignedPercentPoint', () => {
  it('0~1 비율을 부호 포함 %p로 변환한다', () => {
    expect(fmtSignedPercentPoint(0.123)).toBe('+12.3%p')
  })

  it('양수는 + 접두사를 붙인다', () => {
    expect(fmtSignedPercentPoint(0.456)).toBe('+45.6%p')
  })

  it('음수는 - 부호를 유지한다', () => {
    expect(fmtSignedPercentPoint(-0.123)).toBe('-12.3%p')
  })

  it('0은 +0.0%p를 반환한다', () => {
    expect(fmtSignedPercentPoint(0)).toBe('+0.0%p')
  })

  it('null/undefined는 —를 반환한다', () => {
    expect(fmtSignedPercentPoint(null)).toBe('—')
    expect(fmtSignedPercentPoint(undefined)).toBe('—')
  })

  it('digits 파라미터로 소수 자릿수를 지정할 수 있다', () => {
    expect(fmtSignedPercentPoint(0.12345, 2)).toBe('+12.35%p')
  })
})
