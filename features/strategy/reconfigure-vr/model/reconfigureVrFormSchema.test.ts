import { describe, expect, it } from 'vitest'
import { reconfigureVrFormSchema } from './reconfigureVrFormSchema'

describe('reconfigureVrFormSchema', () => {
  it('모든 필드를 생략해도 파싱 성공 (전부 optional)', () => {
    expect(reconfigureVrFormSchema.safeParse({}).success).toBe(true)
  })

  it('유효한 전체 조합은 파싱 성공', () => {
    const result = reconfigureVrFormSchema.safeParse({
      bandWidth: 20,
      intervalWeeks: 4,
      recurringAmount: -100,
      initialGradient: 10,
      gGraceWeeks: 52,
      gStepWeeks: 26,
      gMax: 20,
      initialPoolLimitRate: 0.75,
      pGraceWeeks: 52,
      pStepWeeks: 26,
      poolLimitFloor: 0.5,
      injectShares: 10,
      injectSharePrice: 62.5,
      injectDeposit: 500,
    })
    expect(result.success).toBe(true)
  })

  it('bandWidth가 0 이하면 실패', () => {
    expect(reconfigureVrFormSchema.safeParse({ bandWidth: 0 }).success).toBe(false)
  })

  it('intervalWeeks가 1 미만이면 실패', () => {
    expect(reconfigureVrFormSchema.safeParse({ intervalWeeks: 0 }).success).toBe(false)
  })

  it('gMax가 initialGradient보다 작으면 실패', () => {
    const result = reconfigureVrFormSchema.safeParse({ initialGradient: 10, gMax: 5 })
    expect(result.success).toBe(false)
  })

  it('poolLimitFloor가 initialPoolLimitRate보다 크면 실패', () => {
    const result = reconfigureVrFormSchema.safeParse({ initialPoolLimitRate: 0.5, poolLimitFloor: 0.75 })
    expect(result.success).toBe(false)
  })

  it('injectShares가 0보다 큰데 injectSharePrice가 없으면 실패', () => {
    const result = reconfigureVrFormSchema.safeParse({ injectShares: 10 })
    expect(result.success).toBe(false)
  })

  it('injectShares가 0보다 크고 injectSharePrice도 있으면 성공', () => {
    const result = reconfigureVrFormSchema.safeParse({ injectShares: 10, injectSharePrice: 62.5 })
    expect(result.success).toBe(true)
  })

  it('injectShares가 0이면 injectSharePrice 없이도 성공', () => {
    const result = reconfigureVrFormSchema.safeParse({ injectShares: 0 })
    expect(result.success).toBe(true)
  })

  it('injectDeposit이 음수면 실패', () => {
    expect(reconfigureVrFormSchema.safeParse({ injectDeposit: -1 }).success).toBe(false)
  })
})
