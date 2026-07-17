import { afterEach, describe, expect, it, vi } from 'vitest'
import { fmtSignedUsd, fmtUsd, pnlTextClass, todayKst } from './index'

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
