import { describe, expect, it } from 'vitest'
import { resolveStatsCurrency } from './useStatsCurrency'

describe('resolveStatsCurrency', () => {
  it('선택이 없으면 USD가 있으면 USD, 없으면 목록의 첫 통화', () => {
    expect(resolveStatsCurrency(undefined, ['KRW', 'USD', 'USDT'])).toBe('USD')
    expect(resolveStatsCurrency(undefined, ['KRW', 'USDT'])).toBe('KRW')
    expect(resolveStatsCurrency(undefined, [])).toBe('USD')
  })

  it('목록에 있는 선택은 그대로, 없어진 선택은 기본값으로 돌아간다', () => {
    expect(resolveStatsCurrency('USDT', ['KRW', 'USD', 'USDT'])).toBe('USDT')
    expect(resolveStatsCurrency('USDT', ['KRW'])).toBe('KRW')
  })
})
