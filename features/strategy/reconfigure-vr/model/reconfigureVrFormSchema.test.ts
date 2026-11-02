import { describe, expect, it } from 'vitest'
import { createReconfigureVrFormSchema, reconfigureVrFormSchema } from './reconfigureVrFormSchema'

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

  it('gStepWeeks 0 + gMax 0은 통과', () => {
    expect(reconfigureVrFormSchema.safeParse({ gStepWeeks: 0, gMax: 0 }).success).toBe(true)
  })

  describe('현재값 이어받기', () => {
    const cur = { initialGradient: 10, gStepWeeks: 0, gMax: 0, initialPoolLimitRate: 0.75, pStepWeeks: 0, poolLimitFloor: 0 }
    const schema = createReconfigureVrFormSchema(cur)
    const firstPath = (r: ReturnType<typeof schema.safeParse>) => (r.success ? null : r.error.issues[0].path[0])

    it('pStepWeeks 0→26, poolLimitFloor 비움이면 poolLimitFloor 실패', () => {
      const r = schema.safeParse({ pStepWeeks: 26, poolLimitFloor: null })
      expect(firstPath(r)).toBe('poolLimitFloor')
    })

    it('gStepWeeks 0→26, gMax 비움이면 gMax 실패', () => {
      const r = schema.safeParse({ gStepWeeks: 26, gMax: null })
      expect(firstPath(r)).toBe('gMax')
    })

    it('하한·상한을 채우면 통과', () => {
      expect(schema.safeParse({ gStepWeeks: 26, gMax: 20, pStepWeeks: 26, poolLimitFloor: 0.5 }).success).toBe(true)
    })
  })
})
