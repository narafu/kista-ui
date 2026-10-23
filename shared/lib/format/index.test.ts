import { afterEach, describe, expect, it, vi } from 'vitest'
import { fmtCompactUsd, fmtCompactUsdNarrow, fmtKrw, fmtKrwEok, fmtMoney, fmtQuantity, fmtSignedMoney, roundMoney, fmtSignedUsd, fmtUsd, pnlTextClass, todayKst, nextTradeDateKst, fmtSignedPercent, fmtSignedPercentPoint, fmtDate, fmtMonthDay } from './index'

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

describe('fmtKrw', () => {
  it('천단위 구분자와 "원" 접미사를 붙인다', () => {
    expect(fmtKrw(1000000)).toBe('1,000,000원')
  })

  it('0은 0원을 반환한다', () => {
    expect(fmtKrw(0)).toBe('0원')
  })
})

describe('pnlTextClass', () => {
  it('양수는 text-pos를 반환한다', () => {
    expect(pnlTextClass(10)).toBe('text-pos')
  })

  it('0은 상승색이 아닌 중립색을 반환한다', () => {
    expect(pnlTextClass(0)).toBe('text-muted-foreground')
    expect(pnlTextClass(-0)).toBe('text-muted-foreground')
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

describe('nextTradeDateKst', () => {
  it('KST 04:30 전이면 오늘 거래일', () => {
    // 2026-07-17 04:29 KST
    expect(nextTradeDateKst(new Date('2026-07-16T19:29:00Z'))).toBe('2026-07-17')
  })

  it('KST 04:30부터는 다음 날 거래일', () => {
    // 2026-07-17 04:30 KST
    expect(nextTradeDateKst(new Date('2026-07-16T19:30:00Z'))).toBe('2026-07-18')
  })

  it('KST 자정 직후는 같은 날 거래일', () => {
    // 2026-07-17 00:05 KST
    expect(nextTradeDateKst(new Date('2026-07-16T15:05:00Z'))).toBe('2026-07-17')
  })
})

describe('fmtDate', () => {
  it('formats a date-only string as that calendar day regardless of viewer timezone', () => {
    expect(fmtDate('2026-10-31')).toBe('2026. 10. 31.')
  })
})

describe('fmtMonthDay', () => {
  it('formats a date-only string as that calendar day regardless of viewer timezone', () => {
    expect(fmtMonthDay('2026-10-01')).toBe('10. 1.')
  })
})

describe('fmtMoney', () => {
  it('USD는 $와 소수 둘째 자리로 표시한다', () => {
    expect(fmtMoney(1234.5, 'USD')).toBe('$1,234.50')
  })

  it('KRW는 원 단위로 표시한다', () => {
    expect(fmtMoney(1234567, 'KRW')).toBe('1,234,567원')
  })
})

describe('fmtQuantity', () => {
  it('정수는 그대로 표시한다', () => {
    expect(fmtQuantity(12)).toBe('12')
    expect(fmtQuantity(0)).toBe('0')
  })

  it('소수는 최대 8자리에서 끝의 0을 지운다', () => {
    expect(fmtQuantity(0.000123)).toBe('0.000123')
    expect(fmtQuantity(1.5)).toBe('1.5')
    expect(fmtQuantity(0.123456789)).toBe('0.12345679')
  })

  it('8자리 아래로 내려가는 값은 0으로 표시한다', () => {
    expect(fmtQuantity(0.000000001)).toBe('0')
  })
})

describe('fmtCompactUsd', () => {
  it('소수 최대 1자리로 축약한다', () => {
    expect(fmtCompactUsd(7_600_000_000)).toBe('$7.6B')
    expect(fmtCompactUsd(12_345_000_000)).toBe('$12.3B')
    expect(fmtCompactUsd(12_500_000_000)).toBe('$12.5B')
    expect(fmtCompactUsd(950)).toBe('$950')
  })

})

describe('fmtCompactUsdNarrow', () => {
  it('유효숫자 2자리로 축약한다', () => {
    expect(fmtCompactUsdNarrow(12_345_000_000)).toBe('$12B')
    expect(fmtCompactUsdNarrow(123_456)).toBe('$120K')
    expect(fmtCompactUsdNarrow(1_234)).toBe('$1.2K')
  })
})

describe('fmtMoney', () => {
  it('통화별 단위를 붙인다', () => {
    expect(fmtMoney(1234.5, 'USD')).toBe('$1,234.50')
    expect(fmtMoney(1234, 'KRW')).toBe('1,234원')
    expect(fmtMoney(10.5, 'USDT')).toBe('10.50 USDT')
  })
})

describe('fmtSignedMoney', () => {
  it('부호를 통화 단위 앞에 둔다', () => {
    expect(fmtSignedMoney(1.5, 'USD')).toBe('+$1.50')
    expect(fmtSignedMoney(-1000, 'KRW')).toBe('-1,000원')
    expect(fmtSignedMoney(-2.25, 'USDT')).toBe('-2.25 USDT')
    expect(fmtSignedMoney(0, 'USDT')).toBe('+0.00 USDT')
  })
})

describe('roundMoney', () => {
  it('KRW는 원 단위, USD·USDT는 센트 단위로 반올림한다', () => {
    expect(roundMoney(1234.5, 'KRW')).toBe(1235)
    expect(roundMoney(10.555, 'USDT')).toBeCloseTo(10.56)
    expect(roundMoney(10.554, 'USD')).toBe(10.55)
  })
})
