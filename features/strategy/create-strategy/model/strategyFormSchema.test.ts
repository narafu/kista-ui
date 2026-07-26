import { describe, it, expect } from 'vitest'
import { strategyFormSchema } from './strategyFormSchema'

describe('strategyFormSchema', () => {
  const valid = {
    type: 'INFINITE',
    ticker: 'SOXL',
    autoStart: false,
    seedMode: 'KEEP' as const,
    divisionCount: 20,
    recurringMode: 'HOLD' as const,
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

  it('divisionCount는 양의 정수면 런타임 허용 목록 검증 전 스키마를 통과한다', () => {
    expect(strategyFormSchema.safeParse({ ...valid, divisionCount: 5 }).success).toBe(true)
    expect(strategyFormSchema.safeParse({ ...valid, divisionCount: 60 }).success).toBe(true)
  })

  it('divisionCount가 0 이하면 실패한다', () => {
    expect(strategyFormSchema.safeParse({ ...valid, divisionCount: 0 }).success).toBe(false)
    expect(strategyFormSchema.safeParse({ ...valid, divisionCount: -1 }).success).toBe(false)
  })

  it('divisionCount 소수이면 실패 (int 제약)', () => {
    const result = strategyFormSchema.safeParse({ ...valid, divisionCount: 20.5 })
    expect(result.success).toBe(false)
  })

  it('runtime options are validated by the form while the schema accepts configured values', () => {
    expect(strategyFormSchema.safeParse({ ...valid, divisionCount: 5 }).success).toBe(true)
    expect(strategyFormSchema.safeParse({ ...valid, divisionCount: 20 }).success).toBe(true)
    expect(strategyFormSchema.safeParse({ ...valid, divisionCount: 30 }).success).toBe(true)
    expect(strategyFormSchema.safeParse({ ...valid, divisionCount: 40 }).success).toBe(true)
    expect(strategyFormSchema.safeParse({ ...valid, divisionCount: 25 }).success).toBe(true)
    expect(strategyFormSchema.safeParse({ ...valid, divisionCount: 60 }).success).toBe(true)
  })

  it('VR 필수 필드가 유효하면 파싱 성공', () => {
    const result = strategyFormSchema.safeParse({
      type: 'VR',
      ticker: 'TQQQ',
      autoStart: false,
      seedMode: 'KEEP',
      divisionCount: 20,
      avgPrice: 150,
      quantity: 20,
      intervalWeeks: 4,
      bandWidth: 15,
      recurringAmount: 0,
      recurringMode: 'HOLD' as const,
    })

    expect(result.success).toBe(true)
  })

  it('VR recurringAmount magnitude는 음수를 허용하지 않는다', () => {
    const result = strategyFormSchema.safeParse({
      type: 'VR',
      ticker: 'TQQQ',
      autoStart: false,
      seedMode: 'KEEP',
      divisionCount: 20,
      avgPrice: 150,
      quantity: 20,
      intervalWeeks: 4,
      bandWidth: 15,
      recurringAmount: -100,
      recurringMode: 'WITHDRAW',
    })

    expect(result.success).toBe(false)
  })

  it('VR avgPrice·quantity는 0을 허용한다 (빈 포지션에서 시작)', () => {
    const result = strategyFormSchema.safeParse({
      type: 'VR',
      ticker: 'TQQQ',
      autoStart: false,
      seedMode: 'KEEP',
      divisionCount: 20,
      avgPrice: 0,
      quantity: 0,
      intervalWeeks: 4,
      bandWidth: 15,
      recurringAmount: 200,
      recurringMode: 'DEPOSIT',
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
      avgPrice: 150,
      quantity: 20,
      intervalWeeks: 0,
      bandWidth: 15,
      recurringAmount: 0,
    })

    expect(result.success).toBe(false)
  })

  it('VR 램프 8필드가 유효한 범위면 파싱 성공', () => {
    const result = strategyFormSchema.safeParse({
      type: 'VR',
      ticker: 'TQQQ',
      autoStart: false,
      seedMode: 'KEEP',
      divisionCount: 20,
      recurringMode: 'HOLD',
      initialGradient: 10,
      gGraceWeeks: 52,
      gStepWeeks: 26,
      gMax: 20,
      initialPoolLimitRate: 0.75,
      pGraceWeeks: 52,
      pStepWeeks: 26,
      poolLimitFloor: 0.5,
    })

    expect(result.success).toBe(true)
  })

  it('램프 8필드를 생략해도 파싱 성공 (전부 optional)', () => {
    const result = strategyFormSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('initialGradient가 0 이하면 실패', () => {
    const result = strategyFormSchema.safeParse({ ...valid, type: 'VR', ticker: 'TQQQ', initialGradient: 0 })
    expect(result.success).toBe(false)
  })

  it('gGraceWeeks가 음수면 실패', () => {
    const result = strategyFormSchema.safeParse({ ...valid, type: 'VR', ticker: 'TQQQ', gGraceWeeks: -1 })
    expect(result.success).toBe(false)
  })

  it('initialPoolLimitRate가 1을 초과하면 실패', () => {
    const result = strategyFormSchema.safeParse({ ...valid, type: 'VR', ticker: 'TQQQ', initialPoolLimitRate: 1.5 })
    expect(result.success).toBe(false)
  })

  it('poolLimitFloor가 0이면 실패 (0 초과 필요)', () => {
    const result = strategyFormSchema.safeParse({ ...valid, type: 'VR', ticker: 'TQQQ', poolLimitFloor: 0 })
    expect(result.success).toBe(false)
  })

  it('gStepWeeks·pStepWeeks가 소수이면 실패 (정수 제약)', () => {
    expect(strategyFormSchema.safeParse({ ...valid, type: 'VR', ticker: 'TQQQ', gStepWeeks: 26.5 }).success).toBe(false)
    expect(strategyFormSchema.safeParse({ ...valid, type: 'VR', ticker: 'TQQQ', pStepWeeks: 26.5 }).success).toBe(false)
  })
})
