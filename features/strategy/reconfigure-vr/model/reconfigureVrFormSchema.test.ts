import { describe, expect, it } from 'vitest'
import { createReconfigureVrFormSchema } from './reconfigureVrFormSchema'

describe('reconfigureVrFormSchema', () => {
  const schema = createReconfigureVrFormSchema()

  it('모든 필드를 생략해도 파싱 성공 (전부 optional)', () => {
    expect(schema.safeParse({}).success).toBe(true)
  })

  it('유효한 전체 조합은 파싱 성공', () => {
    const result = schema.safeParse({
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
    expect(schema.safeParse({ bandWidth: 0 }).success).toBe(false)
  })

  it('intervalWeeks가 1 미만이면 실패', () => {
    expect(schema.safeParse({ intervalWeeks: 0 }).success).toBe(false)
  })

  it('gMax가 initialGradient보다 작으면 실패', () => {
    const result = schema.safeParse({ initialGradient: 10, gMax: 5 })
    expect(result.success).toBe(false)
  })

  it('poolLimitFloor가 initialPoolLimitRate보다 크면 실패', () => {
    const result = schema.safeParse({ initialPoolLimitRate: 0.5, poolLimitFloor: 0.75 })
    expect(result.success).toBe(false)
  })

  it('injectShares가 0보다 큰데 injectSharePrice가 없으면 실패', () => {
    const result = schema.safeParse({ injectShares: 10 })
    expect(result.success).toBe(false)
  })

  it('injectShares가 0보다 크고 injectSharePrice도 있으면 성공', () => {
    const result = schema.safeParse({ injectShares: 10, injectSharePrice: 62.5 })
    expect(result.success).toBe(true)
  })

  it('injectShares가 0이면 injectSharePrice 없이도 성공', () => {
    const result = schema.safeParse({ injectShares: 0 })
    expect(result.success).toBe(true)
  })

  it('injectDeposit이 음수면 실패', () => {
    expect(schema.safeParse({ injectDeposit: -1 }).success).toBe(false)
  })

  it.each([
    ['bandWidth', 0], ['intervalWeeks', 0], ['intervalWeeks', 1.5], ['recurringAmount', 1e20], ['initialGradient', 0],
    ['gGraceWeeks', -1], ['gStepWeeks', -1], ['gMax', -1], ['initialPoolLimitRate', 0], ['initialPoolLimitRate', 1.5],
    ['pGraceWeeks', -1], ['pStepWeeks', 1e20], ['poolLimitFloor', -0.1], ['poolLimitFloor', 1.5], ['injectShares', -1],
    ['injectSharePrice', 0], ['injectDeposit', -1], ['withdrawShares', -1], ['withdrawDeposit', -1],
  ])('%s=%s의 오류 문구는 한글이다', (field, value) => {
    const r = schema.safeParse({ [field]: value })
    const messages = r.success ? [] : r.error.issues.filter((i) => i.path[0] === field).map((i) => i.message)
    expect(messages.length).toBeGreaterThan(0)
    for (const m of messages) expect(m).toMatch(/^[^a-z]*[가-힣].*(하세요|합니다)\./)
  })

  it('인출 예수금은 장부 예수금까지만 통과하고, 장부 예수금을 모르면 검사하지 않는다', () => {
    const limited = createReconfigureVrFormSchema(undefined, 100)
    expect(limited.safeParse({ withdrawDeposit: 100 }).success).toBe(true)
    expect(limited.safeParse({ withdrawDeposit: 100.001 }).error?.issues[0].path).toEqual(['withdrawDeposit'])
    expect(schema.safeParse({ withdrawDeposit: 1e9 }).success).toBe(true)
  })

  it('gStepWeeks 0 + gMax 0은 통과', () => {
    expect(schema.safeParse({ gStepWeeks: 0, gMax: 0 }).success).toBe(true)
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
