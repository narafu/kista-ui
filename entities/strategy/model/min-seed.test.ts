import { describe, it, expect } from 'vitest'
import { calcMinSeed, MIN_SEED_DIVISIONS, MIN_SEED_MULTIPLIER } from './min-seed'

describe('calcMinSeed', () => {
  it('basePrice null이면 null 반환', () => {
    expect(calcMinSeed(null, true)).toBeNull()
    expect(calcMinSeed(null, false)).toBeNull()
  })

  it('INFINITE 전략: basePrice × divisionCount × 안전배수', () => {
    // 기본 divisionCount=20, 안전배수=2
    expect(calcMinSeed(25.0, true)).toBe(25.0 * MIN_SEED_DIVISIONS * MIN_SEED_MULTIPLIER)
  })

  it('INFINITE 전략: 커스텀 divisionCount 반영', () => {
    expect(calcMinSeed(25.0, true, 30)).toBe(25.0 * 30 * MIN_SEED_MULTIPLIER)
  })

  it('PRIVACY 전략(isInfinite=false): basePrice / 2 반환', () => {
    expect(calcMinSeed(25.0, false)).toBe(12.5)
    expect(calcMinSeed(25.0, false, 30)).toBe(12.5)
  })

  it('소수점 가격도 올바르게 계산', () => {
    const result = calcMinSeed(12.34, true)
    expect(result).toBeCloseTo(12.34 * MIN_SEED_DIVISIONS * MIN_SEED_MULTIPLIER, 5)
  })
})
