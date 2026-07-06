import { describe, it, expect } from 'vitest'
import { strategyFormSchema } from './strategyFormSchema'

describe('strategyFormSchema', () => {
  const valid = {
    type: 'INFINITE',
    ticker: 'SOXL',
    autoStart: false,
    seedMode: 'KEEP' as const,
    divisionCount: 20,
  }

  it('유효한 값은 파싱 성공', () => {
    const result = strategyFormSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('type 빈 문자열이면 실패', () => {
    const result = strategyFormSchema.safeParse({ ...valid, type: '' })
    expect(result.success).toBe(false)
  })

  it('ticker 빈 문자열이면 실패', () => {
    const result = strategyFormSchema.safeParse({ ...valid, ticker: '' })
    expect(result.success).toBe(false)
  })

  it('seedMode가 KEEP/MAX 외면 실패', () => {
    const result = strategyFormSchema.safeParse({ ...valid, seedMode: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('divisionCount 10 미만이면 실패', () => {
    const result = strategyFormSchema.safeParse({ ...valid, divisionCount: 9 })
    expect(result.success).toBe(false)
  })

  it('divisionCount 50 초과이면 실패', () => {
    const result = strategyFormSchema.safeParse({ ...valid, divisionCount: 51 })
    expect(result.success).toBe(false)
  })

  it('divisionCount 소수이면 실패 (int 제약)', () => {
    const result = strategyFormSchema.safeParse({ ...valid, divisionCount: 20.5 })
    expect(result.success).toBe(false)
  })

  it('VR 필수 필드가 유효하면 파싱 성공', () => {
    const result = strategyFormSchema.safeParse({
      type: 'VR',
      ticker: 'TQQQ',
      autoStart: false,
      seedMode: 'KEEP',
      divisionCount: 20,
      initialValue: 3000,
      intervalWeeks: 4,
      bandWidth: 15,
      recurringAmount: 0,
    })

    expect(result.success).toBe(true)
  })

  it('VR recurringAmount는 음수를 허용한다', () => {
    const result = strategyFormSchema.safeParse({
      type: 'VR',
      ticker: 'TQQQ',
      autoStart: false,
      seedMode: 'KEEP',
      divisionCount: 20,
      initialValue: 3000,
      intervalWeeks: 4,
      bandWidth: 15,
      recurringAmount: -100,
    })

    expect(result.success).toBe(true)
  })

  it('VR intervalWeeks는 1 이상 정수여야 한다', () => {
    const result = strategyFormSchema.safeParse({
      type: 'VR',
      ticker: 'TQQQ',
      autoStart: false,
      seedMode: 'KEEP',
      divisionCount: 20,
      initialValue: 3000,
      intervalWeeks: 0,
      bandWidth: 15,
      recurringAmount: 0,
    })

    expect(result.success).toBe(false)
  })
})
